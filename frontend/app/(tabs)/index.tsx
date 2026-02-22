import React, { useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Group, GroupMember, UserInfo } from '@/types';

// ─── Mock Data ──────────────────────────────────────────
const MOCK_GROUPS: (Group & { memberCount: number })[] = [
  {
    id: '1',
    name: 'Weekend Trip Amsterdam',
    created_by: 'u1',
    created_at: '2026-02-20T12:00:00Z',
    memberCount: 4,
  },
  {
    id: '2',
    name: 'Office Lunch Gang',
    created_by: 'u1',
    created_at: '2026-02-18T12:00:00Z',
    memberCount: 6,
  },
  {
    id: '3',
    name: 'Roommates',
    created_by: 'u2',
    created_at: '2026-02-15T12:00:00Z',
    memberCount: 3,
  },
];

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [groups] = useState(MOCK_GROUPS);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    Alert.alert('Group Created', `"${newGroupName}" created! (Mock)`);
    setNewGroupName('');
    setShowCreate(false);
  };

  const renderGroup = ({ item }: { item: (typeof MOCK_GROUPS)[0] }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/group/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.groupIcon}>
        <FontAwesome name="users" size={20} color={Colors.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.groupMeta, { color: colors.secondaryText }]}>
          {item.memberCount} members
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={colors.secondaryText} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showCreate && (
        <View style={[styles.createBox, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Group name..."
            placeholderTextColor={colors.secondaryText}
            value={newGroupName}
            onChangeText={setNewGroupName}
            autoFocus
            onSubmitEditing={handleCreateGroup}
          />
          <View style={styles.createButtons}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: Colors.lightGray }]}
              onPress={() => setShowCreate(false)}
            >
              <Text style={{ color: Colors.gray }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: Colors.primary }]}
              onPress={handleCreateGroup}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="users" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No groups yet. Create one to get started!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  groupMeta: { fontSize: 13 },
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
  createBox: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  createButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: { fontSize: 16, textAlign: 'center', maxWidth: 250 },
});
