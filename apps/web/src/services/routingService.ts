/**
 * Serviço de Roteamento Viário Real (OSRM - Open Source Routing Machine)
 * Traça o caminho exato pelas ruas, curvas e esquinas de Paraisópolis - MG.
 */

export interface RouteStep {
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  instruction: string;
}

export interface RoadRoute {
  coordinates: [number, number][]; // Lista de [lat, lng] curva a curva
  distanceMeters: number;
  durationSeconds: number;
  formattedDistance: string;
  formattedDuration: string;
  steps: RouteStep[];
}

/**
 * Calcula o ângulo/direção (bearing em graus de 0 a 360) entre duas coordenadas.
 * Usado para fazer o ícone da moto ou bicicleta virar na direção da curva da rua.
 */
export function calculateBearing(start: [number, number], end: [number, number]): number {
  const lat1 = (start[0] * Math.PI) / 180;
  const lat2 = (end[0] * Math.PI) / 180;
  const dLng = ((end[1] - start[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Formata distância em metros ou km
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formata duração em minutos
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `~${minutes} min`;
}

/**
 * Busca a rota real viária no OSRM
 */
export async function fetchRoadRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<RoadRoute> {
  try {
    // OSRM aceita coordenadas no formato: lng,lat;lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Falha no OSRM: status ${res.status}`);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('Nenhuma rota encontrada pelo OSRM');
    }

    const route = data.routes[0];
    // OSRM GeoJSON retorna [lng, lat]. Invertemos para [lat, lng] do Leaflet
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const steps: RouteStep[] = [];
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      for (const st of route.legs[0].steps) {
        if (st.distance > 0 || st.name) {
          steps.push({
            streetName: st.name || 'Rua de Acesso',
            distanceMeters: st.distance,
            durationSeconds: st.duration,
            instruction: st.maneuver?.type || 'continue',
          });
        }
      }
    }

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      formattedDistance: formatDistance(route.distance),
      formattedDuration: formatDuration(route.duration),
      steps,
    };
  } catch (err) {
    console.warn('[OSRM] Usando rota interpolada de fallback para Paraisópolis:', err);
    return generateFallbackRoute(start, end);
  }
}

/**
 * Gera um traçado intermediário realista em Paraisópolis caso a API externa do OSRM oscile.
 * Cria pontos intermediários no grid urbano para que nunca fique uma linha reta simples.
 */
function generateFallbackRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): RoadRoute {
  const stepsCount = 12;
  const coords: [number, number][] = [];

  for (let i = 0; i <= stepsCount; i++) {
    const t = i / stepsCount;
    // Interpolação com desvio angular suave simulando esquinas reais
    const angleJitter = Math.sin(t * Math.PI * 2) * 0.0006;
    const lat = start.lat + (end.lat - start.lat) * t + angleJitter;
    const lng = start.lng + (end.lng - start.lng) * t + (Math.cos(t * Math.PI * 3) * 0.0004);
    coords.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }

  // Distância aproximada (Haversine * 1.3 fator de ruas)
  const R = 6371e3;
  const φ1 = (start.lat * Math.PI) / 180;
  const φ2 = (end.lat * Math.PI) / 180;
  const Δφ = ((end.lat - start.lat) * Math.PI) / 180;
  const Δλ = ((end.lng - start.lng) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const straightMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadMeters = straightMeters * 1.35; // Fator de curvas urbanas

  return {
    coordinates: coords,
    distanceMeters: roadMeters,
    durationSeconds: (roadMeters / 25) * 60, // ~25 km/h moto
    formattedDistance: formatDistance(roadMeters),
    formattedDuration: formatDuration((roadMeters / 25) * 60),
    steps: [
      { streetName: 'Saída do Restaurante', distanceMeters: roadMeters * 0.3, durationSeconds: 60, instruction: 'start' },
      { streetName: 'Ruas Centrais de Paraisópolis', distanceMeters: roadMeters * 0.5, durationSeconds: 120, instruction: 'turn' },
      { streetName: 'Rua do Cliente (Destino)', distanceMeters: roadMeters * 0.2, durationSeconds: 40, instruction: 'arrive' },
    ],
  };
}
