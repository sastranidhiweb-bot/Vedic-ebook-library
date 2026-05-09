import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { light, dark } from '../theme/colors';
import { useTheme } from '../theme/useTheme';

const Title = styled(Text)<{ textColor: string }>`
  font-size: 28px;
  color: ${({ textColor }: { textColor: string }) => textColor};
  margin: 24px 0px;
  font-weight: bold;
`;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { mode } = useTheme();
  const theme = mode === 'light' ? light : dark;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <GlassCard>
        <Title textColor={theme.text}>Vedic e-Book Library</Title>
        <TouchableOpacity
          onPress={() => navigation.navigate('Library')}
          style={{ marginTop: 12, backgroundColor: theme.primary, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: 'bold' }}>
            Explore Library ➜
          </Text>
        </TouchableOpacity>
      </GlassCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16
    }
});
