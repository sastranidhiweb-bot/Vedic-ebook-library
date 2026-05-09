import React from 'react';
import { ViewProps } from 'react-native';
import styled from 'styled-components/native';
import { useTheme } from '../theme/useTheme';

const Card = styled.View<{ themeMode: 'light' | 'dark' }>`
  background: ${({ themeMode }) =>
    themeMode === 'light'
      ? 'rgba(255,255,255,0.4)'
      : 'rgba(0,0,0,0.4)'};
  border-radius: 20px;
  padding: 16px;
  margin: 8px;
  border: 1px solid rgba(255,255,255,0.2);
`;

export const GlassCard: React.FC<ViewProps & { children: React.ReactNode }> = ({
  children,
  ...rest
}) => {
  const { mode } = useTheme();
  return <Card themeMode={mode} {...rest}>{children}</Card>;
};
