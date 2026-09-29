import React from 'react';
import { CheckCircle2, Clock, ChefHat, PackageCheck, Bike, PartyPopper } from 'lucide-react';

export const ORDER_STAGES = [
  { key: 'PENDING', label: 'Pendente', icon: Clock, desc: 'Aguardando aprovação' },
  { key: 'ACCEPTED', label: 'Aceito', icon: CheckCircle2, desc: 'Confirmado pelo restaurante' },
  { key: 'PREPARING', label: 'Preparando', icon: ChefHat, desc: 'Na cozinha com carinho' },
  { key: 'READY_FOR_PICKUP', label: 'Pronto', icon: PackageCheck, desc: 'Esperando entregador' },
  { key: 'IN_TRANSIT', label: 'Em Rota', icon: Bike, desc: 'A caminho no mapa' },
  { key: 'DELIVERED', label: 'Entregue', icon: PartyPopper, desc: 'Bom apetite!' },
];

interface StatusStepperProps {
  currentStatus: string;
  onAdvanceStatus?: () => void;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({ currentStatus, onAdvanceStatus }) => {
  const currentIndex = ORDER_STAGES.findIndex((s) => s.key === currentStatus);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-card-dark">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
            Status do Pedido em Tempo Real
          </h3>
          <p className="text-xl font-black text-white mt-0.5 tracking-tight">
            {ORDER_STAGES[activeIndex]?.label ?? currentStatus}
          </p>
        </div>

        {onAdvanceStatus && activeIndex < ORDER_STAGES.length - 1 && (
          <button
            onClick={onAdvanceStatus}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-black px-4 py-2 rounded-xl text-xs transition shadow-brand-glow active:scale-95"
          >
            Avançar Status ➔
          </button>
        )}
      </div>

      {/* Grid horizontal de passos */}
      <div className="relative flex items-center justify-between">
        {/* Barra de progresso ao fundo */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-zinc-800 -z-0 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${(activeIndex / (ORDER_STAGES.length - 1)) * 100}%` }}
          />
        </div>

        {ORDER_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center z-10">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-tr from-brand-600 to-amber-500 text-white font-black ring-4 ring-brand-500/30 shadow-brand-glow scale-110'
                    : isCompleted
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/80'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span
                className={`text-[11px] font-bold mt-2.5 whitespace-nowrap ${
                  isCurrent ? 'text-brand-400' : isCompleted ? 'text-zinc-200' : 'text-zinc-500'
                }`}
              >
                {stage.label}
              </span>
              <span className="hidden md:block text-[9px] text-zinc-500 text-center max-w-[80px]">
                {stage.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
