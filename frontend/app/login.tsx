import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/services/supabase';
import { signInWithOAuthProvider } from '@/services/oauth';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type SocialProvider = 'google';

const SOCIAL_BUTTONS: Array<{
  provider: SocialProvider;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconColor: string;
}> = [
  {
    provider: 'google',
    label: 'Continue with Google',
    icon: 'google',
    iconColor: '#DB4437',
  },
];

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<SocialProvider | null>(null);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        Alert.alert('Check your email', 'We sent you a confirmation link.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setProviderLoading(provider);
    try {
      await signInWithOAuthProvider(provider);
    } catch (error: any) {
      Alert.alert('Error', error.message || `${provider} sign-in failed`);
    } finally {
      setProviderLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <FontAwesome name="scissors" size={40} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>SnapSplit</Text>
          <Text style={[styles.tagline, { color: colors.secondaryText }]}>
            Scan. Split. Settle.
          </Text>
        </View>

        {SOCIAL_BUTTONS.map((button) => {
          const isLoading = providerLoading === button.provider;

          return (
            <TouchableOpacity
              key={button.provider}
              style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => void handleSocialSignIn(button.provider)}
              disabled={providerLoading !== null}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <FontAwesome name={button.icon} size={20} color={button.iconColor} />
                  <Text style={[styles.socialBtnText, { color: colors.text }]}>
                    {button.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.socialHint, { color: colors.secondaryText }]}> 
          Enable Google in Supabase Auth to use Google sign-in.
        </Text>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.secondaryText }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Email / Password Form */}
        {mode === 'signup' && (
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            placeholder="Display Name"
            placeholderTextColor={colors.secondaryText}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Email"
          placeholderTextColor={colors.secondaryText}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
          placeholder="Password"
          placeholderTextColor={colors.secondaryText}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
        />

        <TouchableOpacity
          style={[styles.authBtn, { backgroundColor: Colors.primary }]}
          onPress={handleEmailAuth}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.authBtnText}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle login/signup */}
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          <Text style={[styles.toggleText, { color: colors.secondaryText }]}>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    marginTop: 4,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 12,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  socialHint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  authBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  authBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: 20,
    padding: 8,
  },
  toggleText: {
    fontSize: 14,
  },
});
