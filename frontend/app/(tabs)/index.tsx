import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createGroup, listGroups } from '@/services/api';
import type { Group } from '@/types';

export default function GroupsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await listGroups();
      setGroups(data);
    } catch (error: any) {
      Alert.alert('Could not load groups', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      setCreating(true);
      const createdGroup = await createGroup(newGroupName.trim());
      setGroups((prev) => [createdGroup, ...prev]);
      setNewGroupName('');
      setShowCreate(false);
      router.push(`/group/${createdGroup.id}`);
    } catch (error: any) {
      Alert.alert('Could not create group', error.message || 'Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
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
          Created {new Date(item.created_at).toLocaleDateString()}
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
              onPress={() => void handleCreateGroup()}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading groups...</Text>
        </View>
      ) : (
      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void loadGroups()}
        refreshing={loading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="users" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No groups yet. Create one to get started!
            </Text>
          </View>
        }
      />
      )}

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
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 15 },
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
