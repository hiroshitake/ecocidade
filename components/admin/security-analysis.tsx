import React from 'react';
import { Platform } from 'react-native';

export default function SecurityAnalysisScreen(props: any) {
  if (Platform.OS === 'web') {
    const Component = require('./security-analysis.web').default;
    return <Component {...props} />;
  }
  const Component = require('./security-analysis.native').default;
  return <Component {...props} />;
}
