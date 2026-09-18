import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Store, Home } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
  timestamp?: string;
}

interface MapTrackerProps {
  driverLocation: Location | null;
  restaurantLocation: Location;
  customerLocation: Location;
  orderStatus: string;
}

export const MapTracker: React.FC<MapTrackerProps> = ({
  driverLocation,
  restaurantLocation,
  customerLocation,
  orderStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    //restaurante e cliente
    const initialCenter: [number, number] = [
      (restaurantLocation.lat + customerLocation.lat) / 2,
      (restaurantLocation.lng + customerLocation.lng) / 2,
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
    });

    // Layer OpenStreetMap 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control estilizado no canto superior direito
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Marcador do Restaurante 
    const restaurantIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 bg-amber-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-amber-500/30 border-2 border-amber-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M7 10h8"/>
            <path d="M7 14h5"/>
          </svg>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap border border-amber-500/30">Restaurante</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker([restaurantLocation.lat, restaurantLocation.lng], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup('<b>Pizzaria & Restaurante Paraisópolis</b><br>Praça Cel. José Vieira, Centro - Pedido #HUB-842');

    // Marcador do Cliente
    const customerIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/30 border-2 border-emerald-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap border border-emerald-500/30">Seu Endereço</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
      .addTo(map)
      .bindPopup('<b>Seu Endereço de Entrega</b><br>Rua 7 de Setembro, 245 - Paraisópolis, MG');

    // Linha de rota inicial tracejada
    const polyline = L.polyline(
      [
        [restaurantLocation.lat, restaurantLocation.lng],
        [customerLocation.lat, customerLocation.lng],
      ],
      {
        color: '#f97316',
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8',
      },
    ).addTo(map);

    polylineRef.current = polyline;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [restaurantLocation, customerLocation]);

  // Atualiza marcador do Entregador 
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const currentCoords: [number, number] = driverLocation
      ? [driverLocation.lat, driverLocation.lng]
      : [restaurantLocation.lat, restaurantLocation.lng];

    const driverIcon = L.divIcon({
      className: 'driver-live-icon',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <!-- Efeito Radar Pulsante -->
          <div class="absolute inset-0 rounded-full bg-orange-500/30 radar-ring"></div>
          <div class="absolute inset-1 rounded-full bg-orange-500/40 animate-ping"></div>

          <!-- Ícone da Moto -->
          <div class="relative flex items-center justify-center w-11 h-11 bg-orange-600 text-white rounded-full shadow-2xl shadow-orange-600/60 border-2 border-orange-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          
          <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-orange-950/90 text-orange-200 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-orange-500/40 shadow">
            Entregador GPS
          </span>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(currentCoords, { icon: driverIcon }).addTo(map);
      driverMarkerRef.current.bindPopup('<b>Entregador Carlos</b><br>Em trânsito com sua entrega!');
    } else {
      driverMarkerRef.current.setIcon(driverIcon);
      driverMarkerRef.current.setLatLng(currentCoords);
    }

    // Mantém o mapa focado suavemente no entregador quando houver atualização de GPS
    if (driverLocation) {
      map.panTo(currentCoords, { animate: true, duration: 1.0 });
    }
  }, [driverLocation, restaurantLocation]);

  // Calcula distância estimada em metros
  const calculateDistance = () => {
    if (!driverLocation) return 1200;
    const R = 6371e3; // raio da Terra em metros
    const φ1 = (driverLocation.lat * Math.PI) / 180;
    const φ2 = (customerLocation.lat * Math.PI) / 180;
    const Δφ = ((customerLocation.lat - driverLocation.lat) * Math.PI) / 180;
    const Δλ = ((customerLocation.lng - driverLocation.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const distance = calculateDistance();
  const etaMinutes = Math.max(1, Math.ceil(distance / 250)); // ~15km/h na cidade

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating HUD Telemetria no Mapa */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs shadow-xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-semibold text-slate-200">GPS Ativo (Redis Cache)</span>
        </div>
        <div className="h-4 w-px bg-slate-700"></div>
        <div>
          <span className="text-slate-400">Distância: </span>
          <span className="font-bold text-orange-400">{distance}m</span>
        </div>
        <div className="h-4 w-px bg-slate-700"></div>
        <div>
          <span className="text-slate-400">Previsão: </span>
          <span className="font-bold text-emerald-400">~{etaMinutes} min</span>
        </div>
      </div>

      {/* Alerta de Proximidade Dinâmico */}
      {distance < 450 && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-orange-500/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-orange-400 flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🚨</span>
            <span className="text-xs sm:text-sm font-bold">
              O entregador está se aproximando do seu endereço! ({distance}m)
            </span>
          </div>
          <span className="text-[11px] bg-orange-700 px-2 py-0.5 rounded-full font-semibold">
            Prepare-se
          </span>
        </div>
      )}
    </div>
  );
};
