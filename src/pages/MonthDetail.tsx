import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, FileStack, ArrowDownUp, Lock, Unlock } from 'lucide-react';
import { useFinancialStore } from '@/stores/financialStore';
import { KPICard } from '@/components/KPICard';
import { InadimplenciaPanel } from '@/components/InadimplenciaPanel';
import { TransactionObservacao } from '@/components/TransactionObservacao';
import { LockDialog } from '@/components/LockDialog';
import { MonthStatusBadge } from '@/components/MonthStatusBadge';
import { FileUploadZone } from '@/components/FileUploadZone';
import { Button } from '@/components/ui/button';
import { parseProjecaoXLSX } from '@/lib/parseProjecao';
import { parseExtratoPDF, extractTextFromPDF } from '@/lib/parseExtrato';
import { useState, useCallback } from 'react';
import { RECEITA_CATEGORIAS, type ReceitaCategoria } from '@/types/financial';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTH_NAMES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const MonthDetail = () => {
  const { period } = useParams<{ period: string }>();
  const navigate = useNavigate();
  const normalizedPeriod = period?.replace('-', '/') || '';
  const { months, travarMes, destravarMes, addProjecaoData, addExtratoData, addObservacaoProjecao, addObservacaoExtrato, addAnexoExtrato, addAnexoProjecao, addDetalheExtrato, uploadedFiles } = useFinancialStore();
  const data = months[normalizedPeriod];
  const [lockDialog, setLockDialog] = useState<'travar' | 'destravar' | null>(null);
  const [activeTab, setActiveTab] = useState<'projecao' | 'extrato' | 'inadimplencia'>('projecao');

  const monthFiles = useMemo(() => uploadedFiles.filter(f => f.period === normalizedPeriod), [uploadedFiles, normalizedPeriod]);

  const handleProjecao = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { records } = parseProjecaoXLSX(buffer);
      if (records.length === 0) return { success: false, message: 'Nenhum registro encontrado' };
      const added = addProjecaoData(normalizedPeriod, records, file.name);
      if (!added) return { success: false, message: 'Arquivo já processado anteriormente' };
      return { success: true, message: `${records.length} registros importados` };
    } catch {
      return { success: false, message: 'Erro ao ler arquivo XLSX' };
    }
  }, [addProjecaoData, normalizedPeriod]);

  const handleExtrato = useCallback(async (file: File) => {
    try {
      const text = await extractTextFromPDF(file);
      const { records } = parseExtratoPDF(text);
      if (records.length === 0) return { success: false, message: 'Nenhuma movimentação encontrada' };
      const added = addExtratoData(normalizedPeriod, records, file.name);
      if (!added) return { success: false, message: 'Arquivo já processado anteriormente' };
      return { success: true, message: `${records.length} movimentações importadas` };
    } catch {
      return { success: false, message: 'Erro ao ler arquivo PDF' };
    }
  }, [addExtratoData, normalizedPeriod]);

  // Category breakdown — must be before early return
  const categorias = useMemo(() => {
    if (!data) return [];
    const map: Record<string, { total: number; pago: number; aberto: number; count: number }> = {};
    data.projecao.forEach(r => {
      const cat = r.categoria || (r.descricao?.toLowerCase().includes('cota') ? 'cota_participativa' :
        r.descricao?.toLowerCase().includes('ades') ? 'adesao' :
        r.descricao?.toLowerCase().includes('extra') ? 'taxa_extra' :
        r.descricao?.toLowerCase() === 'mensalidade' || !r.descricao ? 'mensalidade' : 'outros');
      if (!map[cat]) map[cat] = { total: 0, pago: 0, aberto: 0, count: 0 };
      map[cat].total += r.valorTitulo;
      map[cat].count++;
      if (r.situacao === 'Liquidado') map[cat].pago += r.valorPago;
      else map[cat].aberto += r.valorTitulo;
    });
    return Object.entries(map).map(([key, val]) => ({
      categoria: key as ReceitaCategoria,
      label: RECEITA_CATEGORIAS[key as ReceitaCategoria] || key,
      ...val,
    }));
  }, [data?.projecao]);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Mês {normalizedPeriod} não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/')}>Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  const monthName = MONTH_NAMES[data.monthNum] || '';
  const hasProjecao = data.projecao.length > 0;
  const hasExtrato = data.extrato.length > 0;
  const isComplete = hasProjecao && hasExtrato;

  const deficit = data.totalPrevisto - data.totalRecebido;
  const taxaRecebimento = data.totalPrevisto > 0 ? ((data.totalRecebido / data.totalPrevisto) * 100).toFixed(1) : '0.0';
  const inadimplentes = data.projecao.filter(r => r.situacao === 'Aberto');
  const catChartData = categorias.map(c => ({ name: c.label, pago: c.pago, aberto: c.aberto }));

  const dailyExtrato: Record<string, typeof data.extrato> = {};
  data.extrato.forEach(r => {
    const day = r.data.split('/')[0] || 'sem-data';
    if (!dailyExtrato[day]) dailyExtrato[day] = [];
    dailyExtrato[day].push(r);
  });
  const extratoDays = Object.keys(dailyExtrato).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">{monthName} {data.year}</h1>
                <MonthStatusBadge status={data.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPIs do mês */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard title="Previsto" value={formatCurrency(data.totalPrevisto)} icon={FileStack} delay={0} />
          <KPICard title="Recebido" value={formatCurrency(data.totalRecebido)} icon={TrendingUp} variant="income" delay={0.05} subtitle={`${taxaRecebimento}% do previsto`} />
          <KPICard title="Inadimplência" value={formatCurrency(data.totalInadimplencia)} icon={AlertTriangle} variant="overdue" delay={0.1} subtitle={`${inadimplentes.length} itens`} />
          <KPICard title="Saídas" value={formatCurrency(data.totalSaidas)} icon={TrendingDown} variant="expense" delay={0.15} />
          <KPICard title="Saldo Real" value={formatCurrency(data.saldoReal)} icon={ArrowDownUp} delay={0.2} subtitle={deficit > 0 ? `Déficit: ${formatCurrency(deficit)}` : undefined} />
        </section>

        {/* Upload de complemento se faltar */}
        {(!hasProjecao || !hasExtrato) && (
          <section className="card-glass p-5">
            <p className="text-sm font-semibold text-card-foreground mb-3">
              {!hasProjecao && !hasExtrato ? 'Envie projeção e extrato para este mês' :
                !hasProjecao ? 'Falta projeção de recebíveis para completar conciliação' :
                'Falta extrato bancário para completar conciliação'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!hasProjecao && <FileUploadZone type="projecao" onFileProcess={handleProjecao} />}
              {!hasExtrato && <FileUploadZone type="extrato" onFileProcess={handleExtrato} />}
            </div>
          </section>
        )}

        {/* Categorias de receita */}
        {categorias.length > 0 && (
          <section className="card-glass p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Receitas por Categoria</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                {categorias.map(c => (
                  <div key={c.categoria} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-xs">
                    <div>
                      <span className="font-medium text-card-foreground">{c.label}</span>
                      <span className="text-muted-foreground ml-2">({c.count})</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-income font-medium">{formatCurrency(c.pago)}</span>
                      {c.aberto > 0 && <span className="text-overdue font-medium">{formatCurrency(c.aberto)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={catChartData} layout="vertical" barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0, 0%, 45%)' }} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="pago" name="Pago" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} stackId="a" />
                  <Bar dataKey="aberto" name="Em aberto" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Tabs: Projeção / Extrato / Inadimplência */}
        <section className="card-glass overflow-hidden">
          <div className="flex border-b border-border/50">
            {(['projecao', 'extrato', 'inadimplencia'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground'
                }`}
              >
                {tab === 'projecao' ? `Projeção (${data.projecao.length})` :
                  tab === 'extrato' ? `Extrato (${data.extrato.length})` :
                  `Inadimplência (${inadimplentes.length})`}
              </button>
            ))}
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto">
            {activeTab === 'projecao' && (
              <div className="space-y-1">
                {data.projecao.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum recebível importado</p>
                ) : (
                  data.projecao.map((r, i) => (
                    <div key={r.id || i}>
                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg hover:bg-secondary/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.situacao === 'Liquidado' ? 'bg-income' : 'bg-overdue'}`} />
                          <span className="font-medium text-card-foreground truncate">{r.cliente}</span>
                          <span className="text-muted-foreground flex-shrink-0">{r.dataVencimento}</span>
                          {r.descricao && r.descricao.toLowerCase() !== 'mensalidade' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">{r.descricao}</span>
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
                        onObservacao={(t) => addObservacaoProjecao(data.month, i, t)}
                        onAnexo={(a) => addAnexoProjecao(data.month, i, a)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'extrato' && (
              <div className="space-y-1">
                {data.extrato.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação importada</p>
                ) : (
                  extratoDays.map(day => {
                    const items = dailyExtrato[day];
                    const dayEntradas = items.filter(r => r.tipo === 'C').reduce((s, r) => s + r.valor, 0);
                    const daySaidas = items.filter(r => r.tipo === 'D').reduce((s, r) => s + r.valor, 0);
                    return (
                      <div key={day} className="py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">Dia {day}/{String(data.monthNum).padStart(2, '0')}</span>
                          <div className="flex gap-2">
                            {dayEntradas > 0 && <span className="text-[10px] badge-income">+{formatCurrency(dayEntradas)}</span>}
                            {daySaidas > 0 && <span className="text-[10px] badge-expense">-{formatCurrency(daySaidas)}</span>}
                          </div>
                        </div>
                        {items.map((r, i) => {
                          const extIndex = data.extrato.indexOf(r);
                          return (
                            <div key={r.id || i}>
                              <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg hover:bg-secondary/50">
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
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'inadimplencia' && (
              inadimplentes.length > 0 ? (
                <InadimplenciaPanel inadimplentes={inadimplentes} total={data.totalInadimplencia} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum item inadimplente</p>
              )
            )}
          </div>
        </section>

        {/* Arquivos deste mês */}
        {monthFiles.length > 0 && (
          <section className="card-glass p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Arquivos deste mês</h3>
            <div className="space-y-2">
              {monthFiles.map(f => (
                <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30 text-xs">
                  <div>
                    <span className="font-medium text-card-foreground">{f.name}</span>
                    <span className="text-muted-foreground ml-2">{f.type === 'projecao' ? 'Projeção' : 'Extrato'} · {f.recordCount} registros</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${f.status === 'processed' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                    {f.status === 'processed' ? 'Processado' : f.status === 'duplicate' ? 'Duplicado' : 'Erro'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <LockDialog
        open={lockDialog !== null}
        onClose={() => setLockDialog(null)}
        action={lockDialog || 'travar'}
        onConfirm={(senha) => lockDialog === 'travar' ? travarMes(data.month, senha) : destravarMes(data.month, senha)}
      />
    </div>
  );
};

export default MonthDetail;
