import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'income' | 'expense' | 'overdue';
  delay?: number;
}

const variantStyles = {
  default: 'bg-primary/5 text-primary',
  income: 'bg-income/10 text-income',
  expense: 'bg-expense/10 text-expense',
  overdue: 'bg-overdue/10 text-overdue',
};

export function KPICard({ title, value, subtitle, icon: Icon, variant = 'default', delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="kpi-card group hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${variantStyles[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="section-subtitle mb-1">{title}</p>
      <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      )}
    </motion.div>
  );
}
