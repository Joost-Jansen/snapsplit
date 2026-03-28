import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useScan } from '@/contexts/ScanContext';
import { listGroups, scanReceipt } from '@/services/api';
import type { Group } from '@/types';

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { groupId, groupName } = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
  }>();
  const { setScanResult } = useScan();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(
    groupId ? { id: groupId, name: groupName || 'Selected group' } : null
  );

  useEffect(() => {
    if (selectedGroup || groupId) {
      return;
    }

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const result = await listGroups();
        setGroups(result);
      } catch (error: any) {
        Alert.alert('Could not load groups', error.message || 'Please try again.');
      } finally {
        setLoadingGroups(false);
      }
    };

    void loadGroups();
  }, [groupId, selectedGroup]);

  const pickImage = async (useCamera: boolean) => {
    const permissionMethod = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { status } = await permissionMethod();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera/photo access.');
      return;
    }

    const launchMethod = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await launchMethod({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleScan = async () => {
    if (!imageUri) return;
    if (!selectedGroup && !groupId) {
      Alert.alert('Choose a group', 'Select a group before scanning a receipt.');
      return;
    }

    setLoading(true);

    try {
      const data = await scanReceipt(imageUri);
      setScanResult({ items: data.items });
      router.push({
        pathname: '/split/new',
        params: {
          groupId: selectedGroup?.id || groupId,
          groupName: selectedGroup?.name || groupName,
        },
      });
    } catch (error: any) {
      Alert.alert('Scan Error', error.message || 'Failed to scan receipt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.groupBanner,
          {
            backgroundColor: (selectedGroup || groupId) ? '#ECFDF5' : '#FFFBEB',
            borderColor: (selectedGroup || groupId) ? '#A7F3D0' : '#FCD34D',
          },
        ]}
      >
        <FontAwesome
          name={(selectedGroup || groupId) ? 'users' : 'exclamation-circle'}
          size={16}
          color={(selectedGroup || groupId) ? '#047857' : '#B45309'}
        />
        <Text
          style={[
            styles.groupBannerText,
            { color: (selectedGroup || groupId) ? '#065F46' : '#92400E' },
          ]}
        >
          {(selectedGroup || groupId)
            ? `Saving into ${(selectedGroup?.name || groupName) ?? 'this group'}`
            : 'Choose a real group before scanning.'}
        </Text>
      </View>

      {!groupId && !selectedGroup && (
        <View style={styles.groupPickerSection}>
          <Text style={[styles.groupPickerTitle, { color: colors.text }]}>Choose a group</Text>
          {loadingGroups ? (
            <View style={styles.groupLoadingState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[styles.groupLoadingText, { color: colors.secondaryText }]}>Loading groups...</Text>
            </View>
          ) : (
            <FlatList
              data={groups}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.groupChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedGroup({ id: item.id, name: item.name })}
                >
                  <FontAwesome name="users" size={14} color={Colors.primary} />
                  <Text style={[styles.groupChipText, { color: colors.text }]}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.groupEmptyState}>
                  <Text style={[styles.groupLoadingText, { color: colors.secondaryText }]}>No groups available yet.</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {!groupId && selectedGroup && (
        <TouchableOpacity style={styles.changeGroupBtn} onPress={() => setSelectedGroup(null)}>
          <Text style={styles.changeGroupText}>Change group</Text>
        </TouchableOpacity>
      )}

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.lightGray }]}
              onPress={() => setImageUri(null)}
            >
              <FontAwesome name="times" size={18} color={Colors.gray} />
              <Text style={[styles.actionText, { color: Colors.gray }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
              onPress={handleScan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FontAwesome name="magic" size={18} color="#fff" />
                  <Text style={[styles.actionText, { color: '#fff' }]}>
                    Scan Receipt
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.pickContainer}>
          <View style={styles.iconContainer}>
            <FontAwesome name="file-text-o" size={64} color={Colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Scan a Receipt
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
            Take a photo or choose from your gallery
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: Colors.primary }]}
              onPress={() => pickImage(true)}
            >
              <FontAwesome name="camera" size={20} color="#fff" />
              <Text style={styles.pickBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => pickImage(false)}
            >
              <FontAwesome name="image" size={20} color={Colors.primary} />
              <Text style={[styles.pickBtnText, { color: Colors.primary }]}>
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  groupPickerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  groupPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  groupLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupLoadingText: { fontSize: 14 },
  groupList: { gap: 10, paddingRight: 16 },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  groupChipText: { fontSize: 14, fontWeight: '500' },
  groupEmptyState: { paddingVertical: 4 },
  changeGroupBtn: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 10,
  },
  changeGroupText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pickContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  buttons: { gap: 12, width: '100%' },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  pickBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  previewContainer: { flex: 1 },
  preview: { flex: 1, resizeMode: 'contain' },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionText: { fontSize: 15, fontWeight: '600' },
});
