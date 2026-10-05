import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Navigation, Bike, Compass, Flag, AlertCircle, Play, RotateCw, CheckCircle2 } from 'lucide-react';
import {
  fetchRoadRoute,
  calculateBearing,
  RoadRoute,
  formatDistance,
} from '../services/routingService';

interface Location {
  lat: number;
  lng: number;
  timestamp?: string;
  stepIndex?: number;
  totalSteps?: number;
  progressPercent?: number;
  isArrived?: boolean;
  streetName?: string;
}

interface MapTrackerProps {
  driverLocation: Location | null;
  restaurantLocation: Location;
  customerLocation: Location;
  orderStatus: string;
  customerAddressName?: string;
  restaurantName?: string;
  onArrival?: () => void;
}

export const MapTracker: React.FC<MapTrackerProps> = ({
  driverLocation,
  restaurantLocation,
  customerLocation,
  orderStatus,
  customerAddressName = 'Seu Endereço de Entrega',
  restaurantName = 'Restaurante',
  onArrival,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const polylineHaloRef = useRef<L.Polyline | null>(null);
  const polylineMainRef = useRef<L.Polyline | null>(null);
  const polylineTraveledRef = useRef<L.Polyline | null>(null);
  const prevLocationRef = useRef<[number, number] | null>(null);
  const simTimerRef = useRef<number | null>(null);

  const [routeData, setRouteData] = useState<RoadRoute | null>(null);
  const [currentBearing, setCurrentBearing] = useState<number>(0);
  const [hasArrived, setHasArrived] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<{
    step: number;
    total: number;
    percent: number;
    street: string;
    remainingDist: string;
  } | null>(null);

  // Escuta evento global de chegada do entregador
  useEffect(() => {
    const handleArrived = () => {
      setHasArrived(true);
      if (onArrival) onArrival();
    };
    window.addEventListener('driver:arrived', handleArrived);
    return () => window.removeEventListener('driver:arrived', handleArrived);
  }, [onArrival]);

  // 1. Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [
      (restaurantLocation.lat + customerLocation.lat) / 2,
      (restaurantLocation.lng + customerLocation.lng) / 2,
    ];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
    });

    // Layer OpenStreetMap com alta nitidez
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Traçado da Rota Real (OSRM) e Marcadores Fixos (Restaurante e Cliente)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    let isMounted = true;

    // Remove camadas anteriores se houver
    if (polylineHaloRef.current) map.removeLayer(polylineHaloRef.current);
    if (polylineMainRef.current) map.removeLayer(polylineMainRef.current);

    // Marcador do Restaurante (Pino Laranja estilizado)
    const restaurantIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 bg-amber-500 text-zinc-950 font-bold rounded-2xl shadow-xl shadow-amber-500/30 border-2 border-amber-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M7 10h8"/>
            <path d="M7 14h5"/>
          </svg>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-zinc-900/95 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-amber-500/30 shadow">
            ${restaurantName}
          </span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const restMarker = L.marker([restaurantLocation.lat, restaurantLocation.lng], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup(`<b>${restaurantName}</b><br>Ponto de Retirada`);

    // Marcador do Cliente (Pino Verde com Casa)
    const customerIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 bg-emerald-500 text-zinc-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/30 border-2 border-emerald-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-zinc-900/95 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-emerald-500/30 shadow">
            Destino da Entrega
          </span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const custMarker = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
      .addTo(map)
      .bindPopup(`<b>Endereço de Entrega</b><br>${customerAddressName}`);

    // Busca a rota viária curva a curva no OSRM
    fetchRoadRoute(restaurantLocation, customerLocation).then((route) => {
      if (!isMounted || !mapRef.current) return;
      setRouteData(route);

      // Camada 1: Halo suave de fundo
      const halo = L.polyline(route.coordinates, {
        color: '#ea580c',
        weight: 10,
        opacity: 0.2,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Camada 2: Rota planejada (linha tracejada estilo GPS à frente)
      const mainLine = L.polyline(route.coordinates, {
        color: '#f97316',
        weight: 4,
        opacity: 0.5,
        dashArray: '8, 8', // Efeito tracejado da rota a ser percorrida!
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Camada 3: Traçado percorrido ("tracejando" no asfalto conforme a moto avança)
      const traveledLine = L.polyline([], {
        color: '#10b981', // Verde esmeralda brilhante
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineHaloRef.current = halo;
      polylineMainRef.current = mainLine;
      polylineTraveledRef.current = traveledLine;

      // Enquadra a rota perfeitamente na visualização do mapa
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    });

    return () => {
      isMounted = false;
      map.removeLayer(restMarker);
      map.removeLayer(custMarker);
      if (polylineHaloRef.current) map.removeLayer(polylineHaloRef.current);
      if (polylineMainRef.current) map.removeLayer(polylineMainRef.current);
      if (polylineTraveledRef.current) map.removeLayer(polylineTraveledRef.current);
    };
  }, [restaurantLocation.lat, restaurantLocation.lng, customerLocation.lat, customerLocation.lng, restaurantName, customerAddressName]);

  // Função para executar a simulação visual fluida no mapa ("tracejando" a rota em tempo real)
  const startSimulation = useCallback(() => {
    if (!routeData || routeData.coordinates.length === 0 || !mapRef.current) return;
    const map = mapRef.current;
    const coords = routeData.coordinates;

    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }

    setIsSimulating(true);
    setHasArrived(false);

    // Reseta traçado percorrido
    if (polylineTraveledRef.current) {
      polylineTraveledRef.current.setLatLngs([]);
    }

    let idx = 0;
    const total = coords.length;
    // Duração total ~20 segundos
    const stepDuration = Math.max(200, Math.min(500, Math.round(20000 / total)));
    const stepNames = routeData.steps?.map((s) => s.streetName).filter(Boolean) || [];

    simTimerRef.current = window.setInterval(() => {
      if (idx >= total) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        simTimerRef.current = null;
        setIsSimulating(false);
        setHasArrived(true);
        if (onArrival) onArrival();
        window.dispatchEvent(new CustomEvent('driver:arrived'));
        return;
      }

      const current = coords[idx];
      const next = coords[Math.min(idx + 1, total - 1)];
      const bearing = calculateBearing(current, next);
      setCurrentBearing(bearing);

      // 1. Atualiza a linha verde percorrida ("tracejando" no asfalto)
      if (polylineTraveledRef.current) {
        polylineTraveledRef.current.setLatLngs(coords.slice(0, idx + 1));
      }

      // 2. Atualiza o marcador do veículo com z-index alto
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(current);
        driverMarkerRef.current.setZIndexOffset(10000);
      }

      // 3. Centraliza a câmera no veículo suavemente
      map.panTo(current, { animate: true, duration: stepDuration / 1000 });

      // 4. Distância restante até o cliente
      const R = 6371e3;
      const φ1 = (current[0] * Math.PI) / 180;
      const φ2 = (customerLocation.lat * Math.PI) / 180;
      const Δφ = ((customerLocation.lat - current[0]) * Math.PI) / 180;
      const Δλ = ((customerLocation.lng - current[1]) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const remainingMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

      const percent = Math.round(((idx + 1) / total) * 100);
      const streetIdx = Math.min(
        stepNames.length - 1,
        Math.floor((idx / total) * (stepNames.length || 1)),
      );
      const street =
        streetIdx >= 0 && stepNames[streetIdx]
          ? stepNames[streetIdx]
          : idx === total - 1
          ? customerAddressName
          : 'Ruas de Paraisópolis';

      setSimProgress({
        step: idx + 1,
        total,
        percent,
        street,
        remainingDist: formatDistance(remainingMeters),
      });

      idx++;
    }, stepDuration);
  }, [routeData, onArrival, customerAddressName, customerLocation]);

  // Escuta comando externo (ex: clique no botão 'Replay Rota') para iniciar simulação
  useEffect(() => {
    const handleStartSim = () => startSimulation();
    window.addEventListener('map:start-simulation', handleStartSim);
    return () => window.removeEventListener('map:start-simulation', handleStartSim);
  }, [startSimulation]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  // 3. Atualização Dinâmica do Marcador do Entregador com Rotação (Bearing)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const currentCoords: [number, number] = driverLocation
      ? [driverLocation.lat, driverLocation.lng]
      : [restaurantLocation.lat, restaurantLocation.lng];

    // Calcula rotação/direção da moto
    let bearing = currentBearing;
    if (prevLocationRef.current) {
      const prev = prevLocationRef.current;
      const distTraveled = Math.hypot(currentCoords[0] - prev[0], currentCoords[1] - prev[1]);
      if (distTraveled > 0.00005) {
        bearing = calculateBearing(prev, currentCoords);
        setCurrentBearing(bearing);
      }
    }
    prevLocationRef.current = currentCoords;

    // Distância até o cliente
    const R = 6371e3;
    const φ1 = (currentCoords[0] * Math.PI) / 180;
    const φ2 = (customerLocation.lat * Math.PI) / 180;
    const Δφ = ((customerLocation.lat - currentCoords[0]) * Math.PI) / 180;
    const Δλ = ((customerLocation.lng - currentCoords[1]) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const distanceToCustomer = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

    if (distanceToCustomer <= 45 || driverLocation?.isArrived) {
      setHasArrived(true);
      if (onArrival) onArrival();
    }

    const driverIcon = L.divIcon({
      className: 'driver-live-icon',
      html: `
        <div class="relative flex items-center justify-center w-14 h-14">
          <!-- Efeito Radar Pulsante -->
          <div class="absolute inset-0 rounded-full bg-orange-500/20 radar-ring"></div>
          <div class="absolute inset-1 rounded-full bg-orange-500/30 animate-ping"></div>

          <!-- Círculo da Moto com Rotação Direcional (Cor sólida brand) -->
          <div 
            style="transform: rotate(${Math.round(bearing)}deg); transition: transform 0.25s ease-out;" 
            class="relative flex items-center justify-center w-11 h-11 bg-orange-500 text-white rounded-full shadow-lg border-2 border-white ring-2 ring-orange-400/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="15" cy="5" r="1"/>
              <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
            </svg>
          </div>
          
          <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-zinc-900 text-orange-300 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-zinc-700 shadow-sm">
            Entregador
          </span>
        </div>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker(currentCoords, { 
        icon: driverIcon,
        zIndexOffset: 10000,
      }).addTo(map);
      driverMarkerRef.current.bindPopup('<b>Entregador</b><br>Em rota de entrega');
    } else {
      driverMarkerRef.current.setIcon(driverIcon);
      driverMarkerRef.current.setLatLng(currentCoords);
      driverMarkerRef.current.setZIndexOffset(10000);
    }

    // Se estiver recebendo atualizações externas (ex: WebSockets) e não estiver em simulação local
    if (!isSimulating && driverLocation) {
      if (polylineTraveledRef.current && routeData?.coordinates) {
        let closestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < routeData.coordinates.length; i++) {
          const c = routeData.coordinates[i];
          const d = Math.hypot(c[0] - currentCoords[0], c[1] - currentCoords[1]);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }
        polylineTraveledRef.current.setLatLngs(routeData.coordinates.slice(0, closestIdx + 1));
      }

      if (!hasArrived) {
        map.panTo(currentCoords, { animate: true, duration: 0.8 });
      }
    }
  }, [driverLocation, restaurantLocation, customerLocation, hasArrived, isSimulating, routeData, onArrival]);

  // Calcula distância restante estimada
  const getRemainingDistance = () => {
    if (simProgress) {
      return simProgress.remainingDist;
    }
    if (!driverLocation) {
      return routeData ? routeData.formattedDistance : '2.1 km';
    }
    const R = 6371e3;
    const φ1 = (driverLocation.lat * Math.PI) / 180;
    const φ2 = (customerLocation.lat * Math.PI) / 180;
    const Δφ = ((customerLocation.lat - driverLocation.lat) * Math.PI) / 180;
    const Δλ = ((customerLocation.lng - driverLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const m = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    return formatDistance(m);
  };

  const remainingDist = getRemainingDistance();
  const activePercent = simProgress ? simProgress.percent : driverLocation?.progressPercent;
  const activeStreet = simProgress ? simProgress.street : driverLocation?.streetName;

  return (
    <div className="relative w-full h-full min-h-[280px] rounded-2xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-900">
      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 1. HUD Superior Esquerdo: Badge Compacto de Status e Distância */}
      <div className="absolute top-3 left-3 z-[1000] bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-xl px-3 py-1.5 text-xs text-white shadow-md flex items-center gap-2 pointer-events-auto">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-xs text-zinc-100">
          {hasArrived ? 'Chegou' : isSimulating ? 'Simulando' : 'GPS Ativo'}
        </span>
        <span className="text-zinc-600">•</span>
        <span className="font-bold text-orange-400 font-mono text-xs">{remainingDist}</span>
        <span className="text-zinc-400 text-[11px] hidden xs:inline">({routeData?.formattedDuration || '~5 min'})</span>
      </div>

      {/* 2. HUD Superior Direito: Botão Compacto de Animação */}
      <button
        onClick={startSimulation}
        disabled={isSimulating}
        title="Simular trajeto da entrega pelas ruas"
        className="absolute top-3 right-3 z-[1000] bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700/60 font-semibold px-2.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-[0.98] text-[11px] cursor-pointer"
      >
        <RotateCw className={`w-3.5 h-3.5 text-orange-400 ${isSimulating ? 'animate-spin' : ''}`} />
        <span>{isSimulating ? 'Tracejando...' : 'Animar Rota'}</span>
      </button>

      {/* 3. Painel Inferior: Telemetria e Chegada (Fixado no rodapé sem sobreposição) */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] pointer-events-auto">
        {hasArrived ? (
          /* Chegada ao Destino */
          <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-fadeIn border border-emerald-500">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold">No Local de Entrega</span>
                <span className="text-[11px] text-emerald-100">
                  Entregador em frente ao endereço.
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full font-semibold">
              Destino
            </span>
          </div>
        ) : (activePercent !== undefined || isSimulating) ? (
          /* Em trânsito com progresso */
          <div className="bg-zinc-900/95 backdrop-blur-md rounded-xl p-2.5 border border-zinc-700/60 shadow-lg">
            <div className="flex items-center justify-between text-xs text-white mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <Navigation className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span className="font-semibold truncate text-xs text-zinc-200">
                  {activeStreet || customerAddressName}
                </span>
              </div>
              {activePercent !== undefined && (
                <span className="font-mono font-bold text-orange-400 text-xs flex-shrink-0 ml-2">
                  {activePercent}%
                </span>
              )}
            </div>
            {activePercent !== undefined && (
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${activePercent}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          /* Rumo ao endereço padrão */
          <div className="bg-zinc-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-md border border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <Navigation className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <span className="text-zinc-300 truncate text-[11px]">
                Rumo a <strong className="text-white">{customerAddressName}</strong>
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono flex-shrink-0 ml-2">
              Paraisópolis • MG
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
