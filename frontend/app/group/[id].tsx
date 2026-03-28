import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getGroup, getGroupExpenses } from '@/services/api';
import type { Expense, GroupDetail, GroupMember } from '@/types';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    void loadGroupData(true);
  }, [id]);

  const loadGroupData = async (showLoading = false) => {
    if (!id) {
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const [groupResult, expenseResult] = await Promise.all([
        getGroup(id),
        getGroupExpenses(id),
      ]);

      setGroup(groupResult);
      setExpenses(expenseResult);
    } catch (error: any) {
      Alert.alert('Could not load group', error.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingState, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading group...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.loadingState, { backgroundColor: colors.background }]}> 
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Group not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void loadGroupData(true)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderExpense = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={[styles.expenseCard, { backgroundColor: colors.card }]}
      activeOpacity={0.7}
    >
      <View style={styles.expenseLeft}>
        <Text style={[styles.expenseDesc, { color: colors.text }]}>
          {item.description || 'Untitled expense'}
        </Text>
        <Text style={[styles.expenseDate, { color: colors.secondaryText }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={[styles.expenseAmount, { color: colors.text }]}>€{item.total_amount.toFixed(2)}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.status === 'settled' ? '#D1FAE5' : '#FEF3C7',
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
  );

  const renderMember = ({ item }: { item: GroupMember }) => (
    <View style={[styles.memberRow, { backgroundColor: colors.card }]}> 
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>
          {item.user?.display_name?.charAt(0) ?? '?'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.text }]}>
          {item.user?.display_name || item.user_id}
        </Text>
        <Text style={[styles.memberRole, { color: colors.secondaryText }]}>
          {item.role}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen options={{ title: group.name }} />

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
                color: activeTab === 'expenses' ? Colors.primary : colors.secondaryText,
              },
            ]}
          >
            Expenses ({expenses.length})
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
                color: activeTab === 'members' ? Colors.primary : colors.secondaryText,
              },
            ]}
          >
            Members ({group.members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'expenses' ? (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={() => void loadGroupData()}
          refreshing={refreshing}
          renderItem={renderExpense}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome name="file-text-o" size={36} color={colors.secondaryText} />
              <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>No expenses yet.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={group.members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={() => void loadGroupData()}
          refreshing={refreshing}
          renderItem={renderMember}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/scan',
            params: { groupId: group.id, groupName: group.name },
          })
        }
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 15 },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
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
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyStateText: { fontSize: 15 },
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
