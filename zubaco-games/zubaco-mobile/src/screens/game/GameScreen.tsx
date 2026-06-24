import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Alert } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type GameRoute = {
  key: string;
  name: 'Game';
  params: { gameUrl: string; sessionId: string; token: string };
};

export function GameScreen() {
  const route = useRoute<GameRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const webViewRef = useRef<WebView>(null);

  const { gameUrl, sessionId, token } = route.params;

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
        case 'GAME_COMPLETED':
          // Game finished - navigate back with result
          navigation.goBack();
          break;

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
  }, [navigation]);

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
