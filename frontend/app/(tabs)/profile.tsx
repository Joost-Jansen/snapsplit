import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { getMe, updateMe } from '@/services/api';
import type { User } from '@/types';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const result = await getMe();
        setProfile(result);
        setDisplayName(result.display_name);
      } catch (error: any) {
        Alert.alert('Could not load profile', error.message || 'Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const effectiveDisplayName =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';
  const email = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Display name required', 'Enter a display name before saving.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateMe({ display_name: displayName.trim() });
      setProfile(updated);
      setDisplayName(updated.display_name);
      Alert.alert('Profile updated', 'Your profile changes have been saved.');
    } catch (error: any) {
      Alert.alert('Could not update profile', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingState, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {effectiveDisplayName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {effectiveDisplayName}
        </Text>
        <Text style={[styles.email, { color: colors.secondaryText }]}>
          {email}
        </Text>
      </View>

      <View style={[styles.editorCard, { backgroundColor: colors.card }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit profile</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={colors.secondaryText}
        />
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={() => void handleSaveProfile()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Save profile</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <MenuItem icon="sign-out" label="Sign Out" colors={colors} onPress={handleSignOut} danger />
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  colors,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  colors: any;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <FontAwesome
        name={icon}
        size={18}
        color={danger ? Colors.danger : Colors.primary}
      />
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? Colors.danger : colors.text },
        ]}
      >
        {label}
      </Text>
      <FontAwesome name="chevron-right" size={14} color={colors.secondaryText} />
    </TouchableOpacity>
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
  profileCard: {
    alignItems: 'center',
    padding: 32,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  editorCard: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  menuSection: { padding: 16, gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  menuLabel: { flex: 1, fontSize: 16 },
});
