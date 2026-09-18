export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationUpdate extends GeoPoint {
  driverId: string;
  heading?: number;
  speed?: number;
  timestamp: number;
}
