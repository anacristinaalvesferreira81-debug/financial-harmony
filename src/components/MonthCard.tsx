import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, AlertTriangle, Lock, Unlock } from 'lucide-react';
import type { MonthData } from '@/types/financial';
import { MonthStatusBadge } from '@/components/MonthStatusBadge';
import { InadimplenciaPanel } from '@/components/InadimplenciaPanel';
import { TransactionObservacao } from '@/components/TransactionObservacao';
import { LockDialog } from '@/components/LockDialog';
import { useFinancialStore } from '@/stores/financialStore';
import { Button } from '@/components/ui/button';

const monthNames: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface MonthCardProps {
  data: MonthData;
  index: number;
}

export function MonthCard({ data, index }: MonthCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [lockDialog, setLockDialog] = useState<'travar' | 'destravar' | null>(null);
  const { travarMes, destravarMes, addObservacaoProjecao, addObservacaoExtrato, addAnexoExtrato, addAnexoProjecao, addDetalheExtrato } = useFinancialStore();

  const monthName = monthNames[data.monthNum] || '';
  const taxaRecebimento = data.totalPrevisto > 0
    ? ((data.totalRecebido / data.totalPrevisto) * 100).toFixed(1)
    : '0.0';
  const deficit = data.totalPrevisto - data.totalRecebido;
  const inadimplentes = data.projecao.filter(r => r.situacao === 'Aberto');

  const dailyProjecao: Record<string, typeof data.projecao> = {};
  data.projecao.forEach(r => {
    const day = r.dataVencimento.split('/')[0] || 'sem-data';
    if (!dailyProjecao[day]) dailyProjecao[day] = [];
    dailyProjecao[day].push(r);
  });

  const dailyExtrato: Record<string, typeof data.extrato> = {};
  data.extrato.forEach(r => {
    const day = r.data.split('/')[0] || 'sem-data';
    if (!dailyExtrato[day]) dailyExtrato[day] = [];
    dailyExtrato[day].push(r);
  });

  const allDays = [...new Set([...Object.keys(dailyProjecao), ...Object.keys(dailyExtrato)])]
    .sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="card-elevated overflow-hidden"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data.travado ? 'bg-primary/10' : 'bg-primary/10'}`}>
              {data.travado ? (
                <Lock className="w-5 h-5 text-primary" />
              ) : (
                <span className="text-lg font-bold text-primary">{String(data.monthNum).padStart(2, '0')}</span>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-card-foreground">{monthName} {data.year}</h3>
                <MonthStatusBadge status={data.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.projecao.length > 0 ? `${data.projecao.length} recebíveis` : 'Sem projeção'}
                {' · '}
                {data.extrato.length > 0 ? `${data.extrato.length} movimentações` : 'Sem extrato'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="w-3.5 h-3.5 text-income" />
                <span className="font-medium text-income">{formatCurrency(data.totalRecebido)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm mt-0.5">
                <TrendingDown className="w-3.5 h-3.5 text-expense" />
                <span className="font-medium text-expense">{formatCurrency(data.totalSaidas)}</span>
              </div>
            </div>

            {data.totalInadimplencia > 0 && (
              <div className="badge-overdue hidden md:flex">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {formatCurrency(data.totalInadimplencia)}
              </div>
            )}

            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-5 py-4 bg-secondary/30 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Previsto</p>
                  <p className="text-sm font-semibold">{formatCurrency(data.totalPrevisto)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recebido</p>
                  <p className="text-sm font-semibold text-income">{formatCurrency(data.totalRecebido)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inadimplência</p>
                  <p className="text-sm font-semibold text-overdue">{formatCurrency(data.totalInadimplencia)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxa Receb.</p>
                  <p className="text-sm font-semibold text-primary">{taxaRecebimento}%</p>
                </div>
                {deficit > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Déficit</p>
                    <p className="text-sm font-semibold text-destructive">{formatCurrency(deficit)}</p>
                  </div>
                )}
              </div>

              {/* Inadimplência Panel */}
              {inadimplentes.length > 0 && (
                <div className="px-5 py-3">
                  <InadimplenciaPanel inadimplentes={inadimplentes} total={data.totalInadimplencia} />
                </div>
              )}

              {/* Daily breakdown */}
              <div className="px-5 py-3 max-h-[500px] overflow-y-auto">
                {allDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação</p>
                ) : (
                  allDays.map(day => {
                    const proj = dailyProjecao[day] || [];
                    const ext = dailyExtrato[day] || [];
                    const dayEntradas = proj.filter(r => r.situacao === 'Liquidado').reduce((s, r) => s + r.valorPago, 0);
                    const daySaidas = ext.filter(r => r.tipo === 'D').reduce((s, r) => s + r.valor, 0);

                    return (
                      <div key={day} className="py-3 border-b border-border/30 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Dia {day}/{String(data.monthNum).padStart(2, '0')}
                          </span>
                          <div className="flex gap-3">
                            {dayEntradas > 0 && <span className="text-xs badge-income">+{formatCurrency(dayEntradas)}</span>}
                            {daySaidas > 0 && <span className="text-xs badge-expense">-{formatCurrency(daySaidas)}</span>}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {proj.map((r, i) => {
                            const projIndex = data.projecao.indexOf(r);
                            return (
                              <div key={`p-${i}`}>
                                <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-secondary/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.situacao === 'Liquidado' ? 'bg-income' : 'bg-overdue'}`} />
                                    <span className="truncate text-card-foreground">{r.cliente}</span>
                                    {r.descricao && r.descricao.toLowerCase() !== 'mensalidade' && (
                                      <span className="text-[9px] px-1 py-0 rounded bg-secondary text-muted-foreground flex-shrink-0">{r.descricao}</span>
                                    )}
                                  </div>
                                  <span className={`font-medium flex-shrink-0 ml-2 ${r.situacao === 'Liquidado' ? 'text-income' : 'text-overdue'}`}>
                                    {formatCurrency(r.situacao === 'Liquidado' ? r.valorPago : r.valorTitulo)}
                                  </span>
                                </div>
                                <TransactionObservacao
                                  observacao={r.observacao}
                                  anexos={r.anexos}
                                  travado={data.travado}
                                  onObservacao={(t) => addObservacaoProjecao(data.month, projIndex, t)}
                                  onAnexo={(a) => addAnexoProjecao(data.month, projIndex, a)}
                                />
                              </div>
                            );
                          })}
                          {ext.map((r, i) => {
                            const extIndex = data.extrato.indexOf(r);
                            return (
                              <div key={`e-${i}`}>
                                <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-secondary/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.tipo === 'C' ? 'bg-income' : 'bg-expense'}`} />
                                    <span className="truncate text-card-foreground">{r.historico}</span>
                                  </div>
                                  <span className={`font-medium flex-shrink-0 ml-2 ${r.tipo === 'C' ? 'text-income' : 'text-expense'}`}>
                                    {r.tipo === 'D' ? '-' : '+'}{formatCurrency(r.valor)}
                                  </span>
                                </div>
                                <TransactionObservacao
                                  observacao={r.observacao}
                                  anexos={r.anexos}
                                  detalhes={r.detalhes}
                                  travado={data.travado}
                                  onObservacao={(t) => addObservacaoExtrato(data.month, extIndex, t)}
                                  onAnexo={(a) => addAnexoExtrato(data.month, extIndex, a)}
                                  onDetalhe={(d) => addDetalheExtrato(data.month, extIndex, d)}
                                  showDetalhes={r.valor >= 1000}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Lock controls */}
              <div className="px-5 py-3 border-t border-border/50 flex justify-end gap-2">
                {!data.travado ? (
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setLockDialog('travar')}>
                    <Lock className="w-3 h-3" /> Gravar e Travar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setLockDialog('destravar')}>
                    <Unlock className="w-3 h-3" /> Destravar
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <LockDialog
        open={lockDialog !== null}
        onClose={() => setLockDialog(null)}
        action={lockDialog || 'travar'}
        onConfirm={(senha) => lockDialog === 'travar' ? travarMes(data.month, senha) : destravarMes(data.month, senha)}
      />
    </>
  );
}
