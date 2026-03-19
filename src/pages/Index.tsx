import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, ArrowDownUp, FileStack } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { FileUploadZone } from '@/components/FileUploadZone';
import { MonthCard } from '@/components/MonthCard';
import { UploadedFilesList } from '@/components/UploadedFilesList';
import { useFinancialStore } from '@/stores/financialStore';
import { parseProjecaoXLSX } from '@/lib/parseProjecao';
import { parseExtratoPDF, extractTextFromPDF } from '@/lib/parseExtrato';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const Index = () => {
  const { months, uploadedFiles, addProjecaoData, addExtratoData } = useFinancialStore();

  const sortedMonths = useMemo(() => {
    return Object.values(months).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNum - b.monthNum;
    });
  }, [months]);

  const totals = useMemo(() => {
    const all = Object.values(months);
    return {
      previsto: all.reduce((s, m) => s + m.totalPrevisto, 0),
      recebido: all.reduce((s, m) => s + m.totalRecebido, 0),
      inadimplencia: all.reduce((s, m) => s + m.totalInadimplencia, 0),
      saidas: all.reduce((s, m) => s + m.totalSaidas, 0),
      saldo: all.reduce((s, m) => s + m.saldoReal, 0),
    };
  }, [months]);

  const handleProjecao = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const { records, period } = parseProjecaoXLSX(buffer);
      if (records.length === 0) return { success: false, message: 'Nenhum registro encontrado' };
      const added = addProjecaoData(period, records, file.name);
      if (!added) return { success: false, message: 'Arquivo já processado anteriormente' };
      return { success: true, message: `${records.length} registros importados (${period})` };
    } catch (e) {
      return { success: false, message: 'Erro ao ler arquivo XLSX' };
    }
  }, [addProjecaoData]);

  const handleExtrato = useCallback(async (file: File) => {
    try {
      const text = await extractTextFromPDF(file);
      const { records, period } = parseExtratoPDF(text);
      if (records.length === 0) return { success: false, message: 'Nenhuma movimentação encontrada' };
      const added = addExtratoData(period, records, file.name);
      if (!added) return { success: false, message: 'Arquivo já processado anteriormente' };
      return { success: true, message: `${records.length} movimentações importadas (${period})` };
    } catch (e) {
      return { success: false, message: 'Erro ao ler arquivo PDF' };
    }
  }, [addExtratoData]);

  const hasData = sortedMonths.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Conciliação</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Grupo Win Brasil</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{uploadedFiles.length} arquivos</span>
            <div className="w-2 h-2 rounded-full bg-income animate-pulse" />
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPIs */}
        {hasData && (
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard title="Previsto" value={formatCurrency(totals.previsto)} icon={FileStack} delay={0} />
            <KPICard title="Recebido" value={formatCurrency(totals.recebido)} icon={TrendingUp} variant="income" delay={0.05} />
            <KPICard title="Inadimplência" value={formatCurrency(totals.inadimplencia)} icon={AlertTriangle} variant="overdue" delay={0.1} />
            <KPICard title="Saídas" value={formatCurrency(totals.saidas)} icon={TrendingDown} variant="expense" delay={0.15} />
            <KPICard title="Saldo Real" value={formatCurrency(totals.saldo)} icon={ArrowDownUp} delay={0.2} subtitle="Recebido - Saídas" />
          </section>
        )}

        {/* Upload Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="card-glass p-5">
              <FileUploadZone type="projecao" onFileProcess={handleProjecao} />
            </div>
            <div className="card-glass p-5">
              <FileUploadZone type="extrato" onFileProcess={handleExtrato} />
            </div>
          </div>
          <div className="card-glass p-5">
            <UploadedFilesList files={uploadedFiles} />
            {uploadedFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <FileStack className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum arquivo processado</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Envie seus arquivos ao lado</p>
              </div>
            )}
          </div>
        </section>

        {/* Monthly View */}
        {hasData && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="section-title">Visão Mensal</h2>
                <p className="section-subtitle mt-0.5">{sortedMonths.length} meses catalogados</p>
              </div>
            </div>
            <div className="space-y-3">
              {sortedMonths.map((month, i) => (
                <MonthCard key={month.month} data={month} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-3xl bg-secondary mx-auto mb-6 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Comece enviando seus documentos</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Envie a projeção de recebíveis (.xlsx) e o extrato bancário Sicoob (.pdf) para iniciar a conciliação financeira.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default Index;
