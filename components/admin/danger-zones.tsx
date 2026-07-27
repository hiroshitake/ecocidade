import React from 'react';
import { Platform } from 'react-native';

let Component: React.ComponentType<any>;

if (Platform.OS === 'web') {
  Component = require('./danger-zones.web').default;
} else {
  Component = require('./danger-zones.native').default;
}

export default function DangerZonesScreen() {
  return <Component />;
}
