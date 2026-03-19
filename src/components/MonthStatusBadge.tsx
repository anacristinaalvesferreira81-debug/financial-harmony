import type { MonthStatus } from '@/types/financial';
import { Clock, FileCheck, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

const STATUS_CONFIG: Record<MonthStatus, { label: string; className: string; icon: typeof Clock }> = {
  aguardando_projecao: { label: 'Aguardando Projeção', className: 'bg-muted text-muted-foreground', icon: Clock },
  aguardando_extrato: { label: 'Aguardando Extrato', className: 'bg-muted text-muted-foreground', icon: Clock },
  pronto_conciliacao: { label: 'Pronto p/ Conciliação', className: 'badge-income', icon: FileCheck },
  conciliado: { label: 'Conciliado', className: 'badge-income', icon: CheckCircle2 },
  travado: { label: 'Travado', className: 'bg-primary/10 text-primary', icon: Lock },
};

export function MonthStatusBadge({ status }: { status: MonthStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
