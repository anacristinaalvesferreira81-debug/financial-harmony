import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Lock, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { MonthData, MonthStatus } from '@/types/financial';

const MONTH_NAMES: Record<number, string> = {
  1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);
}

const statusConfig: Record<MonthStatus, { icon: typeof Lock; color: string; label: string }> = {
  aguardando_projecao: { icon: Clock, color: 'text-muted-foreground', label: 'Falta projeção' },
  aguardando_extrato: { icon: Clock, color: 'text-overdue', label: 'Falta extrato' },
  pronto_conciliacao: { icon: CheckCircle2, color: 'text-income', label: 'Pronto' },
  conciliado: { icon: CheckCircle2, color: 'text-primary', label: 'Conciliado' },
  travado: { icon: Lock, color: 'text-primary', label: 'Travado' },
};

interface Props {
  year: number;
  months: MonthData[];
}

export function YearAccordion({ year, months }: Props) {
  const navigate = useNavigate();

  const yearPrevisto = months.reduce((s, m) => s + m.totalPrevisto, 0);
  const yearRecebido = months.reduce((s, m) => s + m.totalRecebido, 0);
  const yearSaidas = months.reduce((s, m) => s + m.totalSaidas, 0);
  const yearInadimplencia = months.reduce((s, m) => s + m.totalInadimplencia, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass overflow-hidden"
    >
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Balancete {year}</h2>
            <p className="text-xs text-muted-foreground">{months.length}/12 meses com dados</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Prev: {formatCurrency(yearPrevisto)}</span>
          <span className="text-income">Rec: {formatCurrency(yearRecebido)}</span>
          <span className="text-expense">Saídas: {formatCurrency(yearSaidas)}</span>
          {yearInadimplencia > 0 && <span className="text-overdue">Inad: {formatCurrency(yearInadimplencia)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 p-3">
        {Array.from({ length: 12 }, (_, i) => {
          const monthData = months.find(m => m.monthNum === i + 1);
          const monthNum = i + 1;

          if (!monthData) {
            return (
              <div
                key={monthNum}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-secondary/30 text-muted-foreground/40 min-h-[90px]"
              >
                <span className="text-xs font-medium">{MONTH_NAMES[monthNum]}</span>
                <span className="text-[10px] mt-1">Sem dados</span>
              </div>
            );
          }

          const cfg = statusConfig[monthData.status];
          const StatusIcon = cfg.icon;

          return (
            <button
              key={monthNum}
              onClick={() => navigate(`/mes/${monthData.month.replace('/', '-')}`)}
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/50 bg-card hover:bg-secondary/50 transition-colors min-h-[90px] group cursor-pointer"
            >
              <div className="flex items-center gap-1 mb-1">
                <StatusIcon className={`w-3 h-3 ${cfg.color}`} />
                <span className="text-xs font-semibold text-card-foreground">{MONTH_NAMES[monthNum]}</span>
              </div>
              <span className="text-[10px] text-income font-medium">{formatCurrency(monthData.totalRecebido)}</span>
              {monthData.totalInadimplencia > 0 && (
                <span className="text-[10px] text-overdue font-medium flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {formatCurrency(monthData.totalInadimplencia)}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground mt-0.5">{cfg.label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary mt-1 transition-colors" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
