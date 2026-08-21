import { Platform } from 'react-native';
import MapNative from './map.native';
import MapWeb from './map.web';

interface Report {
  id: string;
  category?: string;
  description?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

interface Zone {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  description?: string;
  severity?: 'baixa' | 'media' | 'alta';
}

interface MapComponentProps {
  style?: any;
  reports?: Report[];
  zones?: Zone[];
  userLocation?: { latitude: number; longitude: number } | null;
  selectedLocation?: { latitude: number; longitude: number } | null;
  selectLocation?: boolean;
  onSelectLocation?: (location: { latitude: number; longitude: number }) => void;
  onSelectReport?: (report: Report) => void;
  onZoneClick?: (zone: Zone) => void;
}

const MapComponent: React.ComponentType<MapComponentProps> = Platform.OS === 'web' ? MapWeb : MapNative;

export default MapComponent;