import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SplitItem, UserInfo } from '@/types';

// ─── Mock Data (hardcoded first, connect API later) ─────
const MOCK_ITEMS: SplitItem[] = [
  { localId: '1', item_name: 'Caesar Salad', quantity: 1, total_price: 14.5, assignedUserIds: [] },
  { localId: '2', item_name: 'Margherita Pizza', quantity: 1, total_price: 16.0, assignedUserIds: [] },
  { localId: '3', item_name: 'Pasta Carbonara', quantity: 1, total_price: 18.5, assignedUserIds: [] },
  { localId: '4', item_name: 'Grilled Salmon', quantity: 1, total_price: 24.0, assignedUserIds: [] },
  { localId: '5', item_name: 'Tiramisu', quantity: 2, total_price: 16.0, assignedUserIds: [] },
  { localId: '6', item_name: 'IPA Beer', quantity: 3, total_price: 21.0, assignedUserIds: [] },
  { localId: '7', item_name: 'House Wine (glass)', quantity: 2, total_price: 18.0, assignedUserIds: [] },
  { localId: '8', item_name: 'Sparkling Water', quantity: 1, total_price: 4.5, assignedUserIds: [] },
];

const MOCK_MEMBERS: UserInfo[] = [
  { id: 'u1', display_name: 'Joost', avatar_url: null },
  { id: 'u2', display_name: 'Sophie', avatar_url: null },
  { id: 'u3', display_name: 'Lucas', avatar_url: null },
  { id: 'u4', display_name: 'Emma', avatar_url: null },
];

const AVATAR_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function SplitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [items, setItems] = useState<SplitItem[]>(MOCK_ITEMS);
  const [taxAmount, setTaxAmount] = useState('10.50');
  const [tipAmount, setTipAmount] = useState('15.00');

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

  const handleSave = () => {
    const unassigned = items.filter((i) => i.assignedUserIds.length === 0);
    if (unassigned.length > 0) {
      Alert.alert(
        'Unassigned Items',
        `${unassigned.length} item(s) have no one assigned. Assign all items before saving.`
      );
      return;
    }
    Alert.alert('Saved!', 'Expense saved and settlements calculated. (Mock)');
    router.back();
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
        {MOCK_MEMBERS.map((member, idx) => {
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
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
            Tap avatars to assign items
          </Text>
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
              {MOCK_MEMBERS.map((member, idx) => {
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
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <FontAwesome name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save & Calculate Settlements</Text>
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
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
