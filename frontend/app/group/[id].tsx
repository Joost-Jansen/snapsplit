import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { GroupMember, Expense } from '@/types';

// ─── Mock Data ──────────────────────────────────────────
const MOCK_MEMBERS: GroupMember[] = [
  {
    id: 'm1',
    group_id: '1',
    user_id: 'u1',
    role: 'admin',
    joined_at: '2026-02-20T12:00:00Z',
    user: { id: 'u1', display_name: 'Joost', avatar_url: null },
  },
  {
    id: 'm2',
    group_id: '1',
    user_id: 'u2',
    role: 'member',
    joined_at: '2026-02-20T12:00:00Z',
    user: { id: 'u2', display_name: 'Sophie', avatar_url: null },
  },
  {
    id: 'm3',
    group_id: '1',
    user_id: 'u3',
    role: 'member',
    joined_at: '2026-02-20T12:00:00Z',
    user: { id: 'u3', display_name: 'Lucas', avatar_url: null },
  },
  {
    id: 'm4',
    group_id: '1',
    user_id: 'u4',
    role: 'member',
    joined_at: '2026-02-20T12:00:00Z',
    user: { id: 'u4', display_name: 'Emma', avatar_url: null },
  },
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: 'e1',
    group_id: '1',
    created_by: 'u1',
    description: 'Dinner at De Kas',
    total_amount: 156.5,
    tax_amount: 12.5,
    tip_amount: 15.0,
    receipt_image_url: null,
    status: 'pending',
    created_at: '2026-02-21T20:00:00Z',
  },
  {
    id: 'e2',
    group_id: '1',
    created_by: 'u2',
    description: 'Groceries',
    total_amount: 45.2,
    tax_amount: 3.8,
    tip_amount: 0,
    receipt_image_url: null,
    status: 'settled',
    created_at: '2026-02-20T15:00:00Z',
  },
];

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');

  const groupName = 'Weekend Trip Amsterdam'; // Will fetch from API

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: groupName }} />

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'expenses' && { borderBottomColor: Colors.primary },
          ]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'expenses' ? Colors.primary : colors.secondaryText,
              },
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'members' && { borderBottomColor: Colors.primary },
          ]}
          onPress={() => setActiveTab('members')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'members' ? Colors.primary : colors.secondaryText,
              },
            ]}
          >
            Members ({MOCK_MEMBERS.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'expenses' ? (
        <FlatList
          data={MOCK_EXPENSES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.expenseCard, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <View style={styles.expenseLeft}>
                <Text style={[styles.expenseDesc, { color: colors.text }]}>
                  {item.description}
                </Text>
                <Text style={[styles.expenseDate, { color: colors.secondaryText }]}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.expenseRight}>
                <Text style={[styles.expenseAmount, { color: colors.text }]}>
                  €{item.total_amount.toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === 'settled' ? '#D1FAE5' : '#FEF3C7',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: item.status === 'settled' ? '#065F46' : '#92400E',
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={MOCK_MEMBERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.memberRow, { backgroundColor: colors.card }]}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {item.user?.display_name?.charAt(0) ?? '?'}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {item.user?.display_name}
                </Text>
                <Text style={[styles.memberRole, { color: colors.secondaryText }]}>
                  {item.role}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB to add expense */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/scan')}
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 15, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 100 },
  expenseCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseLeft: { flex: 1 },
  expenseDesc: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  expenseDate: { fontSize: 13 },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberRole: { fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
