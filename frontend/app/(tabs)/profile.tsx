import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Mock user data (will connect to Supabase auth later)
  const user = {
    display_name: 'Joost Jansen',
    email: 'joost@example.com',
    avatar_url: null,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={styles.avatar}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {user.display_name.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user.display_name}
        </Text>
        <Text style={[styles.email, { color: colors.secondaryText }]}>
          {user.email}
        </Text>
      </View>

      <View style={styles.menuSection}>
        <MenuItem
          icon="pencil"
          label="Edit Profile"
          colors={colors}
          onPress={() => {}}
        />
        <MenuItem
          icon="bell"
          label="Notifications"
          colors={colors}
          onPress={() => {}}
        />
        <MenuItem
          icon="question-circle"
          label="Help & Support"
          colors={colors}
          onPress={() => {}}
        />
        <MenuItem
          icon="sign-out"
          label="Sign Out"
          colors={colors}
          onPress={() => {}}
          danger
        />
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
