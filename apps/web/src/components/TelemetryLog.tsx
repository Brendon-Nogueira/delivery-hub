import React from 'react';
import { Terminal, Database, Radio, CheckCircle, Clock } from 'lucide-react';

export interface LogItem {
  id: string;
  time: string;
  source: 'REDIS' | 'WEBSOCKET' | 'API' | 'CLIENT';
  message: string;
  payload?: any;
}

interface TelemetryLogProps {
  logs: LogItem[];
  onClearLogs?: () => void;
}

export const TelemetryLog: React.FC<TelemetryLogProps> = ({ logs, onClearLogs }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col h-[460px]">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Console de Eventos (WebSocket & Redis)
          </h3>
        </div>
        {onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 italic">
            Aguardando eventos de telemetria...
          </div>
        ) : (
          logs.map((log) => {
            const badgeColor =
              log.source === 'REDIS'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : log.source === 'WEBSOCKET'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : log.source === 'API'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex flex-col gap-1 hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase border ${badgeColor}`}
                    >
                      {log.source}
                    </span>
                    <span className="text-zinc-400 text-[10px]">{log.time}</span>
                  </div>
                </div>
                <div className="text-zinc-200">{log.message}</div>
                {log.payload && (
                  <pre className="text-[10px] text-zinc-400 bg-zinc-900/90 p-1.5 rounded-md overflow-x-auto">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
