import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';

type GameRoute = {
  key: string;
  name: 'Game';
  params: {
    gameUrl: string;
    sessionId: string;
    token: string;
    gameType?: string;
    level?: number;
    mode?: 'FREE_PLAY' | 'TOURNAMENT' | 'CHALLENGE';
    seasonId?: string;
    stageNumber?: number;
    gameOrder?: number;
    challengeId?: string;
  };
};

export function GameScreen() {
  const route = useRoute<GameRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const webViewRef = useRef<WebView>(null);

  const { gameUrl, sessionId, token, mode, gameType, seasonId, challengeId } = route.params;

  // Inject session data into WebView
  const injectedJavaScript = `
    (function() {
      window.__ZUBACO__ = {
        token: "${token}",
        gameSessionId: "${sessionId}",
        platform: "mobile"
      };
      window.postMessage = window.ReactNativeWebView.postMessage;
    })();
    true;
  `;

  // Handle messages from the game WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'GAME_COMPLETED': {
          const score = Number(data.score) || 0;
          const durationMs = Number(data.duration_ms ?? data.durationMs ?? data.duration) || 0;

          // Submit the authoritative result to the correct backend path based on
          // the mode this session was launched in, then refresh affected caches.
          let submit: Promise<unknown>;
          if (mode === 'TOURNAMENT' && sessionId) {
            submit = api.submitTournamentResult(sessionId, score, durationMs).then(() => {
              queryClient.invalidateQueries({ queryKey: ['seasons'] });
              if (seasonId) {
                queryClient.invalidateQueries({ queryKey: ['seasonStatus', seasonId] });
              }
              if (gameType) {
                queryClient.invalidateQueries({ queryKey: ['leaderboard', gameType] });
                queryClient.invalidateQueries({ queryKey: ['myRank', gameType] });
              }
            });
          } else if (mode === 'CHALLENGE' && sessionId && challengeId) {
            submit = api.submitChallengeScore(challengeId, sessionId, score).then(() => {
              queryClient.invalidateQueries({ queryKey: ['challenges'] });
            });
          } else if (mode === 'FREE_PLAY' && sessionId) {
            submit = api.submitFreePlayResult(sessionId, score, durationMs).then(() => {
              queryClient.invalidateQueries({ queryKey: ['progress'] });
              queryClient.invalidateQueries({ queryKey: ['energy'] });
              if (gameType) {
                queryClient.invalidateQueries({ queryKey: ['leaderboard', gameType] });
                queryClient.invalidateQueries({ queryKey: ['myRank', gameType] });
              }
            });
          } else {
            submit = Promise.resolve();
          }

          submit
            .catch(() => {
              // Non-fatal: the session may already be finalised server-side.
            })
            .finally(() => navigation.goBack());
          break;
        }

        case 'GAME_ERROR':
          Alert.alert('Game Error', data.message || 'Something went wrong');
          navigation.goBack();
          break;

        case 'GAME_EXIT':
          // User wants to leave game
          Alert.alert(
            'Leave Game?',
            'Your progress will be lost.',
            [
              { text: 'Stay', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
            ],
          );
          break;
      }
    } catch {
      // Ignore non-JSON messages
    }
  }, [navigation, mode, sessionId, seasonId, challengeId, gameType, queryClient]);

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Leave Game?',
          'Your progress will be lost.',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
          ],
        );
        return true; // Prevent default back behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation]),
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: gameUrl }}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={true}
        originWhitelist={['*']}
        style={styles.webview}
        // Security: only allow game domains
        onShouldStartLoadWithRequest={(request) => {
          const allowed = [
            'game.zubaco.com',
            'localhost',
            '127.0.0.1',
          ];
          try {
            const url = new URL(request.url);
            return allowed.some((d) => url.hostname.includes(d));
          } catch {
            return false;
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  webview: {
    flex: 1,
  },
});
