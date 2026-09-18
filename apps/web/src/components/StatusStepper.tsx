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
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold">
            Status do Pedido em Tempo Real
          </h3>
          <p className="text-xl font-extrabold text-white mt-0.5">
            {ORDER_STAGES[activeIndex]?.label ?? currentStatus}
          </p>
        </div>

        {onAdvanceStatus && activeIndex < ORDER_STAGES.length - 1 && (
          <button
            onClick={onAdvanceStatus}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-lg shadow-orange-500/20 active:scale-95"
          >
            Avançar Status ➔
          </button>
        )}
      </div>

      {/* Grid horizontal de passos */}
      <div className="relative flex items-center justify-between">
        {/* Barra de progresso ao fundo */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-slate-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
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
                    ? 'bg-orange-500 text-slate-950 font-bold ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/40 scale-110'
                    : isCompleted
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[11px] font-bold mt-2.5 whitespace-nowrap ${
                  isCurrent ? 'text-orange-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {stage.label}
              </span>
              <span className="hidden md:block text-[9px] text-slate-500 text-center max-w-[80px]">
                {stage.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
