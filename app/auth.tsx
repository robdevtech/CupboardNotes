import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme, space } from '../src/ui/theme';
import { completeDropboxOAuth } from '../src/cloud/providers/dropbox';
import { listAdapters } from '../src/cloud/registry';

/**
 * OAuth callback route for Dropbox authentication.
 * Handles both cupboardnotes://auth and exp://.../--/auth redirects.
 * 
 * Called when Dropbox redirects back with authorization code.
 * Completes the PKCE token exchange only if not already handled by connect().
 * Single-flight protected: if connect() already processing, awaits that result.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Signal that the auth session should complete
    WebBrowser.maybeCompleteAuthSession();

    const handleAuth = async () => {
      try {
        // Check if already connected (connect() may have completed)
        const dropboxAdapter = listAdapters().find((a) => a.id === 'dropbox');
        if (dropboxAdapter && (await dropboxAdapter.isConnected())) {
          // Already connected, just redirect
          router.replace('/settings');
          return;
        }

        // Extract code and state from query params
        const code = Array.isArray(params.code) ? params.code[0] : params.code;
        const state = Array.isArray(params.state) ? params.state[0] : params.state;
        
        if (!code) {
          setError('No authorization code received');
          setTimeout(() => router.replace('/settings'), 2000);
          return;
        }

        if (!state) {
          setError('No state parameter received');
          setTimeout(() => router.replace('/settings'), 2000);
          return;
        }

        // Complete OAuth flow (single-flight protected)
        // If connect() is already handling it, this will await that result
        await completeDropboxOAuth(code, state);

        // Redirect to Settings after brief delay
        setTimeout(() => router.replace('/settings'), 500);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Authentication failed');
        setTimeout(() => router.replace('/settings'), 3000);
      }
    };

    void handleAuth();
  }, [params.code, params.state, router]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
      padding: space.xl,
    },
    text: {
      color: colors.text,
      fontSize: 16,
      marginTop: space.md,
      textAlign: 'center',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: space.sm,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.text}>Authentication Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.text}>Redirecting to Settings...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Finishing sign-in…</Text>
        </>
      )}
    </View>
  );
}
