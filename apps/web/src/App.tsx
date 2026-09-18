import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Bike,
  MapPin,
  Play,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Clock,
  ShieldCheck,
  Server,
  Database,
  Radio,
  Send,
  Zap,
} from 'lucide-react';
import { MapTracker } from './components/MapTracker';
import { StatusStepper, ORDER_STAGES } from './components/StatusStepper';
import { TelemetryLog, LogItem } from './components/TelemetryLog';

// Coordenadas padrão: Paraisópolis - MG
const RESTAURANT_COORDS = { lat: -22.553800, lng: -45.779600 }; // Restaurante (Centro, Praça Cel. José Vieira - Paraisópolis MG)
const CUSTOMER_COORDS = { lat: -22.559800, lng: -45.773500 };   // Cliente (Bairro Residencial - Paraisópolis MG)
const ORDER_ID = 'HUB-842';

export function App() {
  const [orderStatus, setOrderStatus] = useState<string>('IN_TRANSIT');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; timestamp: string } | null>({
    ...RESTAURANT_COORDS,
    timestamp: new Date().toLocaleTimeString(),
  });
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const simulationTimerRef = useRef<any>(null);

  // Adiciona item de log no console de telemetria
  const addLog = (source: LogItem['source'], message: string, payload?: any) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        source,
        message,
        payload,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Conexão com o WebSocket /delivery no backend NestJS
  useEffect(() => {
    const wsUrl = 'http://localhost:4000/delivery';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      addLog('WEBSOCKET', `Conectado ao namespace /delivery (Socket ID: ${socket.id})`);

      // room do pedido
      socket.emit('joinDeliveryRoom', { orderId: ORDER_ID });
      addLog('WEBSOCKET', `Entrou na room: order:${ORDER_ID}`);

      // Solicita última localização no Redis
      socket.emit('getLastLocation', { orderId: ORDER_ID });
    });

    socket.on('disconnect', () => {
      setWsConnected(false);
      addLog('WEBSOCKET', 'Desconectado do servidor WebSocket');
    });

    // Evento em tempo real transmitido pelo servidor
    socket.on('driverLocationUpdate', (data: any) => {
      if (data && data.lat && data.lng) {
        setDriverLocation({
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
        });
        addLog('WEBSOCKET', `[driverLocationUpdate] GPS recebido`, {
          lat: data.lat,
          lng: data.lng,
          orderId: data.orderId,
        });
        addLog('REDIS', `Chave atualizada: driver:location:${ORDER_ID} (TTL: 30s)`);
      }
    });

    socket.on('lastLocation', (data: any) => {
      if (data && data.lat) {
        setDriverLocation(data);
        addLog('REDIS', `Última localização obtida do Redis Cache`, data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Simulação de trajeto (interpola do restaurante até o cliente)
  const startSimulation = () => {
    if (isSimulating) {
      clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
      addLog('CLIENT', 'Simulação pausada pelo usuário');
      return;
    }

    setIsSimulating(true);
    setOrderStatus('IN_TRANSIT');
    addLog('CLIENT', 'Iniciando simulação de trajeto do entregador...');

    let step = 0;
    const totalSteps = 16;

    // Dispara também o endpoint backend se disponível
    fetch(`http://localhost:4000/api/v1/delivery/simulate-trip/${ORDER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: totalSteps }),
    })
      .then((res) => res.json())
      .then((data) => {
        addLog('API', 'Backend ativou simulação no NestJS + Redis', data);
      })
      .catch(() => {
        addLog('CLIENT', 'Executando simulação direta no frontend + WebSocket...');
      });

    simulationTimerRef.current = setInterval(() => {
      step++;
      const ratio = Math.min(1, step / totalSteps);

      // Deslocamento com curvas simulando quarteirões
      const jitterLat = Math.sin(ratio * Math.PI * 3) * 0.0004;
      const jitterLng = Math.cos(ratio * Math.PI * 2) * 0.0003;

      const currentLat = Number((RESTAURANT_COORDS.lat + (CUSTOMER_COORDS.lat - RESTAURANT_COORDS.lat) * ratio + jitterLat).toFixed(6));
      const currentLng = Number((RESTAURANT_COORDS.lng + (CUSTOMER_COORDS.lng - RESTAURANT_COORDS.lng) * ratio + jitterLng).toFixed(6));

      const newLocation = {
        lat: currentLat,
        lng: currentLng,
        timestamp: new Date().toLocaleTimeString(),
      };

      setDriverLocation(newLocation);

      // Se o socket estiver conectado, envia evento sendLocation
      if (socketRef.current?.connected) {
        socketRef.current.emit('sendLocation', {
          orderId: ORDER_ID,
          lat: currentLat,
          lng: currentLng,
        });
      }

      addLog('CLIENT', `Posição do entregador emitida (Passo ${step}/${totalSteps})`, newLocation);

      if (step >= totalSteps) {
        clearInterval(simulationTimerRef.current);
        setIsSimulating(false);
        setOrderStatus('DELIVERED');
        addLog('CLIENT', 'Entregador chegou ao destino! Pedido entregue!');
      }
    }, 1500);
  };

  const resetPosition = () => {
    clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    setOrderStatus('PREPARING');
    setDriverLocation({
      ...RESTAURANT_COORDS,
      timestamp: new Date().toLocaleTimeString(),
    });
    addLog('CLIENT', 'Posição do entregador resetada para o Restaurante');
  };

  const advanceOrderStatus = () => {
    const currentIndex = ORDER_STAGES.findIndex((s) => s.key === orderStatus);
    if (currentIndex < ORDER_STAGES.length - 1) {
      const nextStatus = ORDER_STAGES[currentIndex + 1].key;
      setOrderStatus(nextStatus);
      addLog('API', `Status do pedido atualizado: ${nextStatus}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">DeliveryHub</h1>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                  GPS LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">Rastreamento de Entregadores em Tempo Real • Paraisópolis - MG</p>
            </div>
          </div>

          {/* Indicators & Actions */}
          <div className="flex items-center flex-wrap gap-3 text-xs">
            {/* WebSocket Status */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
              <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-slate-300 font-medium">
                WS: <strong className={wsConnected ? 'text-emerald-400' : 'text-amber-400'}>{wsConnected ? 'Conectado (/delivery)' : 'Simulação Local'}</strong>
              </span>
            </div>

            {/* Redis Status */}
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl">
              <Database className="w-3.5 h-3.5 text-red-400" />
              <span className="text-slate-300 font-medium">
                Redis: <strong className="text-red-400">driver:location:{ORDER_ID}</strong>
              </span>
            </div>

            {/* Simular Rota Button */}
            <button
              onClick={startSimulation}
              className={`flex items-center gap-2 font-bold px-4 py-2 rounded-xl transition shadow-lg active:scale-95 ${
                isSimulating
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
              }`}
            >
              {isSimulating ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  Pausar Simulação GPS
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Simular Rota do Entregador
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Stepper de Status do Pedido */}
        <StatusStepper currentStatus={orderStatus} onAdvanceStatus={advanceOrderStatus} />

        {/* Grid Principal: Mapa e Resumo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Mapa e Controles (8 colunas) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Mapa Interativo */}
            <MapTracker
              driverLocation={driverLocation}
              restaurantLocation={RESTAURANT_COORDS}
              customerLocation={CUSTOMER_COORDS}
              orderStatus={orderStatus}
            />

            {/* Painel de Controles da Simulação */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={startSimulation}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-semibold border border-slate-700 transition"
                >
                  <Play className="w-3.5 h-3.5 text-orange-400" />
                  {isSimulating ? 'Pausar' : 'Rodar Simulação'}
                </button>
                <button
                  onClick={resetPosition}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl font-semibold border border-slate-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resetar Posição
                </button>
              </div>

              <div className="text-slate-400 font-mono">
                Coordenadas Atuais:{' '}
                <span className="text-orange-400 font-bold">
                  {driverLocation ? `${driverLocation.lat.toFixed(5)}, ${driverLocation.lng.toFixed(5)}` : 'Aguardando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Detalhes do Pedido & Console (4 colunas) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card Detalhes do Pedido */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-orange-400" />
                  <span className="font-extrabold text-sm text-white">Pedido #{ORDER_ID}</span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Pago via PIX
                </span>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>1x Pizza Margherita Especial</span>
                  <span className="font-bold text-white">R$ 54,90</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>1x Guaraná Antarctica 2L</span>
                  <span className="font-bold text-white">R$ 14,00</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                  <span>Total</span>
                  <span className="text-orange-400">R$ 68,90</span>
                </div>
              </div>

              {/* Info do Entregador */}
              <div className="mt-2 pt-3 border-t border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
                  CM
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-bold text-white">Carlos Mendes</div>
                  <div className="text-slate-400">Honda CG 160 • Placa ABC-4E29</div>
                </div>
                <div className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg font-bold">
                  4.9 ⭐
                </div>
              </div>
            </div>

            {/* Console de Telemetria WebSocket & Redis */}
            <TelemetryLog logs={logs} onClearLogs={() => setLogs([])} />
          </div>
        </div>
      </main>
    </div>
  );
}
export default App;
