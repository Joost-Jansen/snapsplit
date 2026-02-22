import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ScanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    // For now, navigate to split screen with mock data
    // Later, this will call POST /api/receipt/scan
    setTimeout(() => {
      setLoading(false);
      router.push('/split/mock');
    }, 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
