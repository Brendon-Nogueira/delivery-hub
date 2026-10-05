import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  MapPin,
  Search,
  Navigation,
  Check,
  Building2,
  Home,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { useAddress, DeliveryAddress } from '../contexts/AddressContext';
import {
  fetchAddressByCep,
  geocodeAddress,
  reverseGeocode,
  PRESET_ADDRESSES,
  DEFAULT_PARAISOPOLIS_LOCATION,
} from '../services/geocodingService';

export const AddressModal: React.FC = () => {
  const { address, setAddress, isAddressModalOpen, closeAddressModal } = useAddress();

  const [cep, setCep] = useState(address.cep || '');
  const [street, setStreet] = useState(address.street || '');
  const [number, setNumber] = useState(address.number || '');
  const [complement, setComplement] = useState(address.complement || '');
  const [neighborhood, setNeighborhood] = useState(address.neighborhood || '');
  const [city, setCity] = useState(address.city || 'Paraisópolis');
  const [state, setState] = useState(address.state || 'MG');
  const [lat, setLat] = useState(address.lat || DEFAULT_PARAISOPOLIS_LOCATION.lat);
  const [lng, setLng] = useState(address.lng || DEFAULT_PARAISOPOLIS_LOCATION.lng);

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincronizar campos quando o modal abre com o endereço atual
  useEffect(() => {
    if (isAddressModalOpen) {
      setCep(address.cep || '');
      setStreet(address.street || '');
      setNumber(address.number || '');
      setComplement(address.complement || '');
      setNeighborhood(address.neighborhood || '');
      setCity(address.city || 'Paraisópolis');
      setState(address.state || 'MG');
      setLat(address.lat || DEFAULT_PARAISOPOLIS_LOCATION.lat);
      setLng(address.lng || DEFAULT_PARAISOPOLIS_LOCATION.lng);
      setErrorMsg(null);
    }
  }, [isAddressModalOpen, address]);

  // Travar o scroll enquanto o modal estiver aberto
  useEffect(() => {
    if (isAddressModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isAddressModalOpen]);

  // Fechar no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAddressModal();
    };
    if (isAddressModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isAddressModalOpen]);

  if (!isAddressModalOpen) return null;

  // Auto-busca ao preencher os 8 dígitos do CEP
  const handleCepChange = async (val: string) => {
    // Máscara 00000-000
    const raw = val.replace(/\D/g, '').slice(0, 8);
    const masked = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
    setCep(masked);

    if (raw.length === 8) {
      setIsLoadingCep(true);
      setErrorMsg(null);
      try {
        const result = await fetchAddressByCep(raw);
        if (result) {
          setStreet(result.street);
          setNeighborhood(result.neighborhood);
          setCity(result.city);
          setState(result.state);

          // Geocodifica para obter coordenadas reais
          setIsGeocoding(true);
          const geo = await geocodeAddress(result.street, result.city, result.state);
          if (geo) {
            setLat(geo.lat);
            setLng(geo.lng);
          }
          setIsGeocoding(false);
        } else {
          setErrorMsg('CEP não localizado. Preencha o nome da rua manualmente.');
        }
      } catch (err) {
        setErrorMsg('Erro ao consultar CEP na rede.');
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Usar GPS atual do navegador
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    setIsGettingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);

        // Faz geocodificação reversa
        const reversed = await reverseGeocode(userLat, userLng);
        if (reversed) {
          setStreet(reversed.street);
          setNeighborhood(reversed.neighborhood);
          setCity(reversed.city);
          setState(reversed.state);
        }
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('GPS negado ou indisponível:', err);
        setErrorMsg('Permissão de GPS negada. Selecione um endereço abaixo.');
        setIsGettingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Selecionar preset rápido
  const handleSelectPreset = (preset: (typeof PRESET_ADDRESSES)[0]) => {
    setStreet(preset.street);
    setNumber(preset.number);
    setNeighborhood(preset.neighborhood);
    setCity('Paraisópolis');
    setState('MG');
    setCep('37660-000');
    setLat(preset.lat);
    setLng(preset.lng);
    setErrorMsg(null);
  };

  // Buscar coordenadas se o usuário alterar a rua manualmente
  const handleStreetBlur = async () => {
    if (!street.trim()) return;
    setIsGeocoding(true);
    try {
      const geo = await geocodeAddress(`${street} ${number}`.trim(), city, state);
      if (geo) {
        setLat(geo.lat);
        setLng(geo.lng);
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) {
      setErrorMsg('Informe o nome da rua ou avenida.');
      return;
    }

    const formattedAddress = `${street}${number ? `, ${number}` : ''}${
      complement ? ` (${complement})` : ''
    } - ${neighborhood || 'Centro'}, ${city} - ${state}`;

    const newAddress: DeliveryAddress = {
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim() || 'Centro',
      city: city.trim() || 'Paraisópolis',
      state: state.trim() || 'MG',
      cep: cep.trim() || '37660-000',
      lat,
      lng,
      formattedAddress,
    };

    setAddress(newAddress);
    closeAddressModal();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={closeAddressModal}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-lg bg-white border border-zinc-200 rounded-3xl p-6 md:p-7 shadow-drawer text-zinc-900 z-10 max-h-[92vh] overflow-y-auto">
        {/* Botão Fechar */}
        <button
          onClick={closeAddressModal}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Título & Ícone */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <MapPin className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight">
              Onde você quer receber seu pedido?
            </h2>
            <p className="text-xs text-zinc-400">
              Endereço real para cálculo de rota e entrega em Paraisópolis - MG
            </p>
          </div>
        </div>

        {/* Erro */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botão GPS */}
        <button
          type="button"
          onClick={handleUseGps}
          disabled={isGettingGps}
          className="w-full mb-4 p-3 rounded-2xl border border-brand-200 bg-brand-50/60 hover:bg-brand-100/60 text-brand-700 flex items-center justify-between transition active:scale-[0.99] group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-sm">
              <Navigation className={`w-4 h-4 ${isGettingGps ? 'animate-spin' : ''}`} />
            </div>
            <div className="text-left">
              <span className="block text-xs font-black text-brand-800">
                Usar minha localização atual (GPS)
              </span>
              <span className="text-[11px] text-brand-600">
                Detecta automaticamente latitude e longitude
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-brand-500 group-hover:translate-x-0.5 transition">
            Ativar &rarr;
          </span>
        </button>

        {/* Sugestões Rápidas de Paraisópolis */}
        <div className="mb-4">
          <span className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Locais Frequentes em Paraisópolis:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {PRESET_ADDRESSES.map((preset) => {
              const isSelected = street === preset.street;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl text-left text-xs border transition active:scale-95 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                      : 'border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <span className="block truncate font-bold text-[11px]">{preset.name}</span>
                  <span className="block truncate text-[10px] text-zinc-400">{preset.neighborhood}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulário Manual / CEP */}
        <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                CEP (ViaCEP)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="37660-000"
                  maxLength={9}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                />
                {isLoadingCep && (
                  <div className="absolute right-2.5 top-2.5 w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Rua / Avenida
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                onBlur={handleStreetBlur}
                placeholder="Ex: Rua 7 de Setembro"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Número
              </label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="123"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Complemento
              </label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto 12, Bloco B"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Bairro
              </label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Centro, Bairro Novo..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Coordenadas GPS Calculadas */}
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-brand-500" />
              <span>Coordenadas GPS da Rota:</span>
            </div>
            <div className="font-mono text-[10px] text-zinc-600 bg-white px-2 py-0.5 rounded border border-zinc-200">
              {isGeocoding ? (
                <span className="text-brand-500 animate-pulse font-sans">Calculando rota...</span>
              ) : (
                `${lat.toFixed(4)}, ${lng.toFixed(4)}`
              )}
            </div>
          </div>

          {/* Botão de Confirmação */}
          <button
            type="submit"
            className="w-full mt-3 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirmar Este Endereço de Entrega</span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};
