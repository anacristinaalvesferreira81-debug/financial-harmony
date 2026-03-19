import { AlertTriangle, User, Calendar, DollarSign } from 'lucide-react';
import type { ProjecaoRecord } from '@/types/financial';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Props {
  inadimplentes: ProjecaoRecord[];
  total: number;
}

export function InadimplenciaPanel({ inadimplentes, total }: Props) {
  if (inadimplentes.length === 0) return null;

  return (
    <div className="border border-overdue/20 rounded-xl bg-overdue/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-overdue" />
          <h4 className="text-sm font-semibold text-card-foreground">
            Inadimplência — {inadimplentes.length} {inadimplentes.length === 1 ? 'item' : 'itens'}
          </h4>
        </div>
        <span className="text-sm font-bold text-overdue">{formatCurrency(total)}</span>
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {inadimplentes.map((r, i) => (
          <div key={r.id || i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/60 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-card-foreground truncate">{r.cliente}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{r.cpfCnpj}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" />
                    {r.dataVencimento}
                  </span>
                </div>
              </div>
            </div>
            <span className="font-semibold text-overdue flex-shrink-0 ml-2">
              {formatCurrency(r.valorTitulo)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
