import { create } from 'zustand';
import type { MonthData, UploadedFile, ProjecaoRecord, ExtratoRecord } from '@/types/financial';

interface FinancialStore {
  months: Record<string, MonthData>;
  uploadedFiles: UploadedFile[];
  selectedMonth: string | null;
  addProjecaoData: (period: string, records: ProjecaoRecord[], fileName: string) => boolean;
  addExtratoData: (period: string, records: ExtratoRecord[], fileName: string) => boolean;
  setSelectedMonth: (month: string | null) => void;
}

function computeMonthData(existing: MonthData | undefined, period: string): MonthData {
  const [m, y] = period.split('/').map(Number);
  const base: MonthData = existing || {
    month: period,
    year: y,
    monthNum: m,
    projecao: [],
    extrato: [],
    totalPrevisto: 0,
    totalRecebido: 0,
    totalInadimplencia: 0,
    totalSaidas: 0,
    totalEntradas: 0,
    saldoReal: 0,
  };

  base.totalPrevisto = base.projecao.reduce((s, r) => s + r.valorTitulo, 0);
  base.totalRecebido = base.projecao.filter(r => r.situacao === 'Liquidado').reduce((s, r) => s + r.valorPago, 0);
  base.totalInadimplencia = base.projecao.filter(r => r.situacao === 'Aberto').reduce((s, r) => s + r.valorTitulo, 0);
  base.totalSaidas = base.extrato.filter(r => r.tipo === 'D').reduce((s, r) => s + r.valor, 0);
  base.totalEntradas = base.extrato.filter(r => r.tipo === 'C').reduce((s, r) => s + r.valor, 0);
  base.saldoReal = base.totalRecebido - base.totalSaidas;

  return base;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  months: {},
  uploadedFiles: [],
  selectedMonth: null,

  addProjecaoData: (period, records, fileName) => {
    const state = get();
    const isDuplicate = state.uploadedFiles.some(f => f.name === fileName && f.type === 'projecao');
    if (isDuplicate) return false;

    const existing = state.months[period];
    const monthData = { ...(existing || computeMonthData(undefined, period)), projecao: records };
    const updated = computeMonthData(monthData, period);

    set({
      months: { ...state.months, [period]: updated },
      uploadedFiles: [...state.uploadedFiles, {
        id: crypto.randomUUID(),
        name: fileName,
        type: 'projecao',
        uploadDate: new Date().toISOString(),
        period,
        recordCount: records.length,
        status: 'processed',
      }],
    });
    return true;
  },

  addExtratoData: (period, records, fileName) => {
    const state = get();
    const isDuplicate = state.uploadedFiles.some(f => f.name === fileName && f.type === 'extrato');
    if (isDuplicate) return false;

    const existing = state.months[period];
    const monthData = { ...(existing || computeMonthData(undefined, period)), extrato: records };
    const updated = computeMonthData(monthData, period);

    set({
      months: { ...state.months, [period]: updated },
      uploadedFiles: [...state.uploadedFiles, {
        id: crypto.randomUUID(),
        name: fileName,
        type: 'extrato',
        uploadDate: new Date().toISOString(),
        period,
        recordCount: records.length,
        status: 'processed',
      }],
    });
    return true;
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),
}));
