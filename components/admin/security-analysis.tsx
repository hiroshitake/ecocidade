import React from 'react';
import { Platform } from 'react-native';

let Component: React.ComponentType<any>;

if (Platform.OS === 'web') {
  Component = require('./security-analysis.web').default;
} else {
  Component = require('./security-analysis.native').default;
}

export default function SecurityAnalysisScreen() {
  return <Component />;
}
