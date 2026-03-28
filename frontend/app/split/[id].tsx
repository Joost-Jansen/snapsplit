import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { useScan } from '@/contexts/ScanContext';
import { createExpense, getGroup } from '@/services/api';
import type { GroupDetail, SplitItem, UserInfo } from '@/types';

const AVATAR_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function SplitScreen() {
  const { id, groupId, groupName } = useLocalSearchParams<{
    id: string;
    groupId?: string;
    groupName?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();
  const { scanResult, setScanResult } = useScan();
  const [saving, setSaving] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('Scanned receipt');
  const [group, setGroup] = useState<GroupDetail | null>(null);

  // Convert scanned items to split items with local IDs
  const initialItems: SplitItem[] = useMemo(() => {
    if (scanResult?.items) {
      return scanResult.items.map((item, idx) => ({
        ...item,
        localId: String(idx + 1),
        assignedUserIds: [],
      }));
    }
    return [];
  }, [scanResult]);

  // Members: start with current user, allow adding more
  const [members, setMembers] = useState<UserInfo[]>(() => {
    const currentUser: UserInfo = {
      id: user?.id || 'me',
      display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Me',
      avatar_url: user?.user_metadata?.avatar_url || null,
    };
    return [currentUser];
  });
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);

  const [items, setItems] = useState<SplitItem[]>(initialItems);
  const [taxAmount, setTaxAmount] = useState('0');
  const [tipAmount, setTipAmount] = useState('0');

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!groupId) return;

    const loadGroup = async () => {
      try {
        setLoadingGroup(true);
        const result = await getGroup(groupId);
        setGroup(result);
        setMembers(
          result.members.map((member) => ({
            id: member.user?.id || member.user_id,
            display_name:
              member.user?.display_name || member.user_id.slice(0, 8),
            avatar_url: member.user?.avatar_url || null,
          }))
        );
      } catch (error: any) {
        Alert.alert('Could not load group members', error.message || 'Please try again.');
      } finally {
        setLoadingGroup(false);
      }
    };

    void loadGroup();
  }, [groupId]);

  const toggleAssignment = (itemLocalId: string, userId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.localId !== itemLocalId) return item;
        const isAssigned = item.assignedUserIds.includes(userId);
        return {
          ...item,
          assignedUserIds: isAssigned
            ? item.assignedUserIds.filter((id) => id !== userId)
            : [...item.assignedUserIds, userId],
        };
      })
    );
  };

  // Calculate per-person totals (mirrors backend splitter.py logic)
  const personTotals = useMemo(() => {
    const shares: Record<string, number> = {};
    const tax = parseFloat(taxAmount) || 0;
    const tip = parseFloat(tipAmount) || 0;

    // Base shares
    for (const item of items) {
      if (item.assignedUserIds.length === 0) continue;
      const perPerson = item.total_price / item.assignedUserIds.length;
      for (const uid of item.assignedUserIds) {
        shares[uid] = (shares[uid] || 0) + perPerson;
      }
    }

    // Proportional tax+tip
    const totalBase = Object.values(shares).reduce((a, b) => a + b, 0);
    const overhead = tax + tip;

    const result: Record<string, number> = {};
    for (const [uid, base] of Object.entries(shares)) {
      const proportion = totalBase > 0 ? base / totalBase : 0;
      result[uid] = base + proportion * overhead;
    }

    return result;
  }, [items, taxAmount, tipAmount]);

  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0);
  const grandTotal =
    subtotal + (parseFloat(taxAmount) || 0) + (parseFloat(tipAmount) || 0);

  const handleSave = async () => {
    if (!groupId) {
      Alert.alert(
        'Choose a group first',
        'Open the scan flow from a group to save this receipt.'
      );
      return;
    }

    const unassigned = items.filter((i) => i.assignedUserIds.length === 0);
    if (unassigned.length > 0) {
      Alert.alert(
        'Unassigned Items',
        `${unassigned.length} item(s) have no one assigned. Assign all items before saving.`
      );
      return;
    }

    const lines = members
      .map((m) => {
        const total = personTotals[m.id] || 0;
        if (total === 0) return null;
        return `${m.display_name}: €${total.toFixed(2)}`;
      })
      .filter(Boolean);

    try {
      setSaving(true);
      await createExpense({
        group_id: groupId,
        description: expenseDescription.trim() || 'Scanned receipt',
        total_amount: grandTotal,
        tax_amount: parseFloat(taxAmount) || 0,
        tip_amount: parseFloat(tipAmount) || 0,
        items: items.map((item) => ({
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.quantity > 0 ? item.total_price / item.quantity : item.total_price,
          total_price: item.total_price,
          assigned_user_ids: item.assignedUserIds,
        })),
      });

      setScanResult(null);
      Alert.alert('Expense Saved', lines.join('\n') || 'Expense saved successfully.', [
        {
          text: 'View Group',
          onPress: () => router.replace(`/group/${groupId}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Could not save expense', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addMember = () => {
    if (groupId) return;
    if (!newMemberName.trim()) return;
    const newMember: UserInfo = {
      id: `local_${Date.now()}`,
      display_name: newMemberName.trim(),
      avatar_url: null,
    };
    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setShowAddMember(false);
  };

  const renderItem = ({ item }: { item: SplitItem }) => (
    <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
      <View style={styles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.text }]}>
            {item.item_name}
          </Text>
          {item.quantity > 1 && (
            <Text style={[styles.itemQty, { color: colors.secondaryText }]}>
              x{item.quantity}
            </Text>
          )}
        </View>
        <Text style={[styles.itemPrice, { color: colors.text }]}>
          €{item.total_price.toFixed(2)}
        </Text>
      </View>

      {/* Avatar selector row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.avatarRow}
      >
        {members.map((member, idx) => {
          const isSelected = item.assignedUserIds.includes(member.id);
          const bgColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <TouchableOpacity
              key={member.id}
              onPress={() => toggleAssignment(item.localId, member.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: isSelected ? bgColor : colors.background,
                    borderColor: isSelected ? bgColor : colors.border,
                    borderWidth: isSelected ? 0 : 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    { color: isSelected ? '#fff' : colors.secondaryText },
                  ]}
                >
                  {member.display_name.charAt(0)}
                </Text>
              </View>
              <Text
                style={[
                  styles.avatarLabel,
                  {
                    color: isSelected ? bgColor : colors.secondaryText,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {member.display_name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Split Receipt' }} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.localId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View
              style={[
                styles.groupNotice,
                {
                  backgroundColor: groupId ? '#ECFDF5' : '#FFFBEB',
                  borderColor: groupId ? '#A7F3D0' : '#FCD34D',
                },
              ]}
            >
              <FontAwesome
                name={groupId ? 'users' : 'exclamation-circle'}
                size={16}
                color={groupId ? '#047857' : '#B45309'}
              />
              <Text
                style={[
                  styles.groupNoticeText,
                  { color: groupId ? '#065F46' : '#92400E' },
                ]}
              >
                {groupId
                  ? `Saving into ${group?.name || groupName || 'this group'}`
                  : 'This split is in preview mode. Open Scan from a group to save it.'}
              </Text>
            </View>

            {/* People bar */}
            <View style={[styles.peopleBar, { backgroundColor: colors.card }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
                {members.map((m, idx) => (
                  <View key={m.id} style={styles.personChip}>
                    <View style={[styles.chipAvatar, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                      <Text style={styles.chipAvatarText}>{m.display_name.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.chipName, { color: colors.text }]} numberOfLines={1}>{m.display_name}</Text>
                  </View>
                ))}
                {!groupId && (
                  <TouchableOpacity
                    style={[styles.addPersonBtn, { borderColor: Colors.primary }]}
                    onPress={() => setShowAddMember(true)}
                  >
                    <FontAwesome name="plus" size={12} color={Colors.primary} />
                    <Text style={[styles.addPersonText, { color: Colors.primary }]}>Add</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            {/* Add member input */}
            {!groupId && showAddMember && (
              <View style={[styles.addMemberBox, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.addMemberInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Person's name..."
                  placeholderTextColor={colors.secondaryText}
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  autoFocus
                  onSubmitEditing={addMember}
                />
                <TouchableOpacity style={[styles.addMemberBtn, { backgroundColor: Colors.primary }]} onPress={addMember}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAddMember(false)} style={{ padding: 8 }}>
                  <FontAwesome name="times" size={16} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.descriptionCard, { backgroundColor: colors.card }]}> 
              <Text style={[styles.descriptionLabel, { color: colors.secondaryText }]}>Expense description</Text>
              <TextInput
                style={[styles.descriptionInput, { color: colors.text, borderColor: colors.border }]}
                value={expenseDescription}
                onChangeText={setExpenseDescription}
                placeholder="Dinner, groceries, brunch..."
                placeholderTextColor={colors.secondaryText}
              />
            </View>

            {loadingGroup && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.inlineLoadingText, { color: colors.secondaryText }]}>Loading group members...</Text>
              </View>
            )}

            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="exclamation-circle" size={32} color={colors.secondaryText} />
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                  No items found. Go back and scan a receipt.
                </Text>
              </View>
            ) : (
              <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
                Tap avatars to assign items ({items.length} items)
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {/* Tax & Tip Inputs */}
            <View style={[styles.inputRow, { backgroundColor: colors.card }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
                  Tax
                </Text>
                <View style={styles.inputWrapper}>
                  <Text style={[styles.currencySign, { color: colors.secondaryText }]}>€</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={taxAmount}
                    onChangeText={setTaxAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
                  Tip
                </Text>
                <View style={styles.inputWrapper}>
                  <Text style={[styles.currencySign, { color: colors.secondaryText }]}>€</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={tipAmount}
                    onChangeText={setTipAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>
              </View>
            </View>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
                  Subtotal
                </Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  €{subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Per-person breakdown */}
              {members.map((member, idx) => {
                const total = personTotals[member.id] || 0;
                if (total === 0) return null;
                return (
                  <View key={member.id} style={styles.summaryRow}>
                    <View style={styles.personRow}>
                      <View
                        style={[
                          styles.miniAvatar,
                          { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] },
                        ]}
                      >
                        <Text style={styles.miniAvatarText}>
                          {member.display_name.charAt(0)}
                        </Text>
                      </View>
                      <Text style={[styles.summaryLabel, { color: colors.text }]}>
                        {member.display_name}
                      </Text>
                    </View>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      €{total.toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>
                  Total
                </Text>
                <Text style={[styles.totalValue, { color: Colors.primary }]}>
                  €{grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => void handleSave()}
              activeOpacity={0.8}
              disabled={saving || loadingGroup || items.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="check" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Save & Calculate Settlements</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  groupNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  groupNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  peopleBar: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chipName: { fontSize: 13, fontWeight: '500', maxWidth: 80 },
  addPersonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addPersonText: { fontSize: 13, fontWeight: '600' },
  addMemberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  addMemberInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  addMemberBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  descriptionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inlineLoadingText: { fontSize: 13 },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemQty: { fontSize: 13, marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '700' },
  avatarRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  avatarLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 48,
  },
  footer: { marginTop: 8, gap: 12 },
  inputRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    gap: 16,
  },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  currencySign: { fontSize: 16, marginRight: 4 },
  input: { fontSize: 16, fontWeight: '600', flex: 1 },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
