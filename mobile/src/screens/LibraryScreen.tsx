import React from 'react';
import { SafeAreaView, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../theme/useTheme';
import { light, dark } from '../theme/colors';
import { useEbooks } from '../hooks/useEbooks';

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const theme = mode === 'light' ? light : dark;
  const { ebooks, loading } = useEbooks();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.header, { color: theme.text }]}>Library</Text>
      {loading ? (
        <Text style={{ color: theme.text, textAlign: 'center', marginTop: 20 }}>Loading...</Text>
      ) : (
        <FlatList
          data={ebooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('Reader', { ebookId: item.id })}>
              <GlassCard>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>{item.title}</Text>
                  <Text style={{ color: theme.text, marginTop: 4 }}>{item.author}</Text>
                  <Text style={{ color: theme.text, marginTop: 8, opacity: 0.8 }}>{item.description}</Text>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', marginTop: 24 }
});
