import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../constants/theme';

interface InlineErrorProps {
  message: string;
  visible: boolean;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.dangerLight,
    borderRadius: 6,
  },
  text: {
    color: C.danger,
    fontSize: 12,
    lineHeight: 16,
  },
});