import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { light, dark } from '../theme/colors';
import { useRoute } from '@react-navigation/native';
import { GlassCard } from '../components/GlassCard';

export default function ReaderScreen() {
  const { mode } = useTheme();
  const theme = mode === 'light' ? light : dark;
  const route = useRoute<any>();
  const { ebookId } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <GlassCard>
            <Text style={[styles.title, { color: theme.text }]}>Reading Book ID: {ebookId}</Text>
            <Text style={[styles.text, { color: theme.text, marginTop: 16 }]}>
                Here the actual content of the book will be rendered. You can integrate an EPUB reader, PDF renderer, or plain text webview based on the backend content type.
            </Text>
        </GlassCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
    text: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});
