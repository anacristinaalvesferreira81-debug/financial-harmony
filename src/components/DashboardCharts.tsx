import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import type { MonthData } from '@/types/financial';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(value);
}

interface Props {
  months: MonthData[];
  year: number;
}

export function DashboardCharts({ months, year }: Props) {
  const barData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = months.find(md => md.monthNum === i + 1);
      return {
        name: MONTH_NAMES[i],
        previsto: m?.totalPrevisto || 0,
        recebido: m?.totalRecebido || 0,
        saidas: m?.totalSaidas || 0,
        inadimplencia: m?.totalInadimplencia || 0,
        saldo: m?.saldoReal || 0,
        hasData: !!m,
      };
    });
  }, [months]);

  const pieData = useMemo(() => {
    const totalRecebido = months.reduce((s, m) => s + m.totalRecebido, 0);
    const totalInadimplencia = months.reduce((s, m) => s + m.totalInadimplencia, 0);
    const totalSaidas = months.reduce((s, m) => s + m.totalSaidas, 0);
    return [
      { name: 'Recebido', value: totalRecebido },
      { name: 'Inadimplência', value: totalInadimplencia },
      { name: 'Saídas', value: totalSaidas },
    ].filter(d => d.value > 0);
  }, [months]);

  const PIE_COLORS = [
    'hsl(142, 71%, 45%)',
    'hsl(38, 92%, 50%)',
    'hsl(0, 72%, 51%)',
  ];

  const saldoData = useMemo(() => {
    let acumulado = 0;
    return barData.map(d => {
      if (d.hasData) acumulado += d.saldo;
      return { name: d.name, saldo: d.hasData ? acumulado : null };
    });
  }, [barData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Receita x Saída por mês */}
      <div className="lg:col-span-2 card-glass p-5">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Receita vs Saídas — {year}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} tickFormatter={formatCurrency} width={70} />
            <Tooltip
              formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', fontSize: 12 }}
            />
            <Bar dataKey="recebido" name="Recebido" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="inadimplencia" name="Inadimplência" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribuição geral */}
      <div className="card-glass p-5">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Distribuição — {year}</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">Sem dados</div>
        )}
      </div>

      {/* Saldo acumulado */}
      <div className="lg:col-span-3 card-glass p-5">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Saldo Acumulado — {year}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={saldoData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} tickFormatter={formatCurrency} width={70} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
            <Area type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(215, 100%, 50%)" fill="hsl(215, 100%, 50%)" fillOpacity={0.1} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
