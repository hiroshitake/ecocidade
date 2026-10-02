import React from 'react';
import { Platform } from 'react-native';

export default function DangerZonesScreen(props: any) {
  if (Platform.OS === 'web') {
    const Component = require('./danger-zones.web').default;
    return <Component {...props} />;
  }
  const Component = require('./danger-zones.native').default;
  return <Component {...props} />;
}
