import React from 'react';
import { Platform } from 'react-native';
import MapNative from './map.native';
import MapWeb from './map.web';

interface MapComponentProps {
  style?: any; // Adjust based on platform
  reports?: Array<{
    id: string;
    category?: string;
    description?: string;
    location?: { latitude?: number; longitude?: number; address?: string };
    photoURL?: string;
    createdAt?: any;
  }>;
  zones?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
    description?: string;
    severity?: 'baixa' | 'media' | 'alta';
  }>;
  userLocation?: { latitude: number; longitude: number } | null;
  selectedLocation?: { latitude: number; longitude: number } | null;
  selectLocation?: boolean;
  onSelectLocation?: (location: { latitude: number; longitude: number }) => void;
  onSelectReport?: (report: any) => void;
  onZoneClick?: (zone: {
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    name?: string;
    description?: string;
    severity?: 'baixa' | 'media' | 'alta';
  }) => void;
}

const MapComponent: React.ComponentType<MapComponentProps> = Platform.OS === 'web' ? MapWeb : MapNative;

export default MapComponent;