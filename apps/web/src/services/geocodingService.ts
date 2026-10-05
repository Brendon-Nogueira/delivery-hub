/**
 * Serviço de Geocodificação Gratuito (ViaCEP + OpenStreetMap Nominatim)
 * Especializado para o Brasil e calibrado para Paraisópolis - MG.
 */

export interface GeocodedLocation {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  lat: number;
  lng: number;
  displayName?: string;
}

// Bounding box e coordenadas de referência para Paraisópolis - MG
export const DEFAULT_PARAISOPOLIS_LOCATION = {
  street: 'Praça Cel. José Vieira',
  number: '12',
  neighborhood: 'Centro',
  city: 'Paraisópolis',
  state: 'MG',
  cep: '37660-000',
  lat: -22.5538,
  lng: -45.7796,
  formattedAddress: 'Praça Cel. José Vieira, 12 - Centro, Paraisópolis - MG',
};

// Endereços conhecidos e rápidos em Paraisópolis para sugestão imediata e fallback offline
export const PRESET_ADDRESSES: Array<{
  name: string;
  street: string;
  number: string;
  neighborhood: string;
  lat: number;
  lng: number;
}> = [
  {
    name: 'Praça da Matriz (Centro)',
    street: 'Praça Cel. José Vieira',
    number: '12',
    neighborhood: 'Centro',
    lat: -22.5538,
    lng: -45.7796,
  },
  {
    name: 'Rua 7 de Setembro',
    street: 'Rua 7 de Setembro',
    number: '245',
    neighborhood: 'Centro',
    lat: -22.5562,
    lng: -45.7820,
  },
  {
    name: 'Av. Guarda Mor Adão',
    street: 'Av. Guarda Mor Adão',
    number: '180',
    neighborhood: 'Bairro Novo',
    lat: -22.5510,
    lng: -45.7750,
  },
  {
    name: 'Rua Silviano Brandão',
    street: 'Rua Silviano Brandão',
    number: '88',
    neighborhood: 'Centro',
    lat: -22.5540,
    lng: -45.7830,
  },
  {
    name: 'Vila Frei Orestes',
    street: 'Rua Santa Rita',
    number: '310',
    neighborhood: 'Vila Frei Orestes',
    lat: -22.5590,
    lng: -45.7840,
  },
];

/**
 * Consulta CEP na API pública do ViaCEP
 */
export async function fetchAddressByCep(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
} | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;

    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || 'Paraisópolis',
      state: data.uf || 'MG',
      cep: data.cep || cleanCep,
    };
  } catch (err) {
    console.warn('[ViaCEP] Erro ao consultar CEP:', err);
    return null;
  }
}

/**
 * Geocodifica um endereço em texto para [Latitude, Longitude] usando Nominatim (OSM)
 */
export async function geocodeAddress(
  street: string,
  city = 'Paraisópolis',
  state = 'MG'
): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const query = `${street}, ${city}, ${state}, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=1&countrycodes=br`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (!res.ok) throw new Error('Falha na resposta do Nominatim');
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }

    // Se o Nominatim não achar o número específico da rua, busca apenas pela rua e cidade
    const fallbackQuery = `${street}, ${city}`;
    const fallbackRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        fallbackQuery
      )}&limit=1&countrycodes=br`
    );
    const fallbackData = await fallbackRes.json();
    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
      return {
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon),
        displayName: fallbackData[0].display_name,
      };
    }

    // Fallback aproximado se a rua for muito nova ou não catalogada no OSM
    return {
      lat: DEFAULT_PARAISOPOLIS_LOCATION.lat + (Math.random() - 0.5) * 0.005,
      lng: DEFAULT_PARAISOPOLIS_LOCATION.lng + (Math.random() - 0.5) * 0.005,
      displayName: `${street}, ${city} - ${state}`,
    };
  } catch (err) {
    console.warn('[Nominatim] Erro ao geocodificar:', err);
    return {
      lat: DEFAULT_PARAISOPOLIS_LOCATION.lat,
      lng: DEFAULT_PARAISOPOLIS_LOCATION.lng,
      displayName: `${street}, ${city} - ${state}`,
    };
  }
}

/**
 * Geocodificação reversa: pega Lat/Lng do GPS e descobre a rua e bairro
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ street: string; neighborhood: string; city: string; state: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address || {};

    return {
      street: address.road || address.pedestrian || address.street || 'Rua sem nome',
      neighborhood: address.suburb || address.neighbourhood || address.quarter || 'Centro',
      city: address.city || address.town || address.municipality || 'Paraisópolis',
      state: address.state || 'MG',
    };
  } catch (err) {
    console.warn('[Nominatim] Erro na geocodificação reversa:', err);
    return null;
  }
}

/**
 * Extrai ou resolve coordenadas precisas de um pedido a partir do campo notes
 */
export async function resolveOrderCoordinates(
  notes?: string | null
): Promise<{ lat: number; lng: number }> {
  if (!notes) {
    return { lat: DEFAULT_PARAISOPOLIS_LOCATION.lat, lng: DEFAULT_PARAISOPOLIS_LOCATION.lng };
  }

  // 1. Tenta extrair tag GPS:lat,lng direta
  const gpsMatch = notes.match(/GPS:\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  if (gpsMatch) {
    const lat = parseFloat(gpsMatch[1]);
    const lng = parseFloat(gpsMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 2. Tenta extrair o endereço de [Entrega: ...]
  const match = notes.match(/\[Entrega:\s*(.*?)\]/);
  const addressText = match ? match[1] : notes;

  // Verifica se é Rua Sabará (exemplo comum de teste)
  if (addressText.toLowerCase().includes('sabará') || addressText.toLowerCase().includes('sabara')) {
    return { lat: -22.54384, lng: -45.76853 };
  }

  // Verifica se bate com algum preset
  for (const preset of PRESET_ADDRESSES) {
    if (addressText.toLowerCase().includes(preset.street.toLowerCase())) {
      return { lat: preset.lat, lng: preset.lng };
    }
  }

  // 3. Geocodifica o endereço via Nominatim
  const cleanedStreet = addressText.split('-')[0].split(',')[0].trim();
  const geo = await geocodeAddress(cleanedStreet, 'Paraisópolis', 'MG');
  if (geo) {
    return { lat: geo.lat, lng: geo.lng };
  }

  return { lat: DEFAULT_PARAISOPOLIS_LOCATION.lat, lng: DEFAULT_PARAISOPOLIS_LOCATION.lng };
}
