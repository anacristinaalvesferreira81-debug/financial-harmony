import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MonthData, UploadedFile, ProjecaoRecord, ExtratoRecord, MonthStatus, Anexo, DetalheValor } from '@/types/financial';

interface FinancialStore {
  months: Record<string, MonthData>;
  uploadedFiles: UploadedFile[];
  selectedMonth: string | null;

  // Ações de dados
  addProjecaoData: (period: string, records: ProjecaoRecord[], fileName: string) => boolean;
  addExtratoData: (period: string, records: ExtratoRecord[], fileName: string) => boolean;
  setSelectedMonth: (month: string | null) => void;

  // Travamento
  travarMes: (period: string, senha: string) => boolean;
  destravarMes: (period: string, senha: string) => boolean;

  // Observações e anexos
  addObservacaoProjecao: (period: string, recordIndex: number, texto: string) => void;
  addObservacaoExtrato: (period: string, recordIndex: number, texto: string) => void;
  addAnexoExtrato: (period: string, recordIndex: number, anexo: Anexo) => void;
  addAnexoProjecao: (period: string, recordIndex: number, anexo: Anexo) => void;
  addDetalheExtrato: (period: string, recordIndex: number, detalhe: DetalheValor) => void;
  removeDetalheExtrato: (period: string, recordIndex: number, detalheId: string) => void;

  // Inadimplência
  getInadimplentes: (period: string) => ProjecaoRecord[];
}

const SENHA_DIRETORIA = 'dir2025'; // Placeholder — será substituído por auth real

function resolveStatus(data: Partial<MonthData>): MonthStatus {
  if (data.travado) return 'travado';
  const hasProjecao = (data.projecao?.length ?? 0) > 0;
  const hasExtrato = (data.extrato?.length ?? 0) > 0;
  if (hasProjecao && hasExtrato) return 'pronto_conciliacao';
  if (hasProjecao) return 'aguardando_extrato';
  if (hasExtrato) return 'aguardando_projecao';
  return 'aguardando_projecao';
}

function computeMonthData(existing: MonthData | undefined, period: string): MonthData {
  const [m, y] = period.split('/').map(Number);
  const base: MonthData = existing || {
    month: period,
    year: y,
    monthNum: m,
    status: 'aguardando_projecao',
    projecao: [],
    extrato: [],
    totalPrevisto: 0,
    totalRecebido: 0,
    totalInadimplencia: 0,
    totalSaidas: 0,
    totalEntradas: 0,
    saldoReal: 0,
    travado: false,
  };

  base.totalPrevisto = base.projecao.reduce((s, r) => s + r.valorTitulo, 0);
  base.totalRecebido = base.projecao.filter(r => r.situacao === 'Liquidado').reduce((s, r) => s + r.valorPago, 0);
  base.totalInadimplencia = base.projecao.filter(r => r.situacao === 'Aberto').reduce((s, r) => s + r.valorTitulo, 0);
  base.totalSaidas = base.extrato.filter(r => r.tipo === 'D').reduce((s, r) => s + r.valor, 0);
  base.totalEntradas = base.extrato.filter(r => r.tipo === 'C').reduce((s, r) => s + r.valor, 0);
  base.saldoReal = base.totalRecebido - base.totalSaidas;
  base.status = resolveStatus(base);

  return base;
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      months: {},
      uploadedFiles: [],
      selectedMonth: null,

      addProjecaoData: (period, records, fileName) => {
        const state = get();
        const isDuplicate = state.uploadedFiles.some(f => f.name === fileName && f.type === 'projecao');
        if (isDuplicate) return false;

        // Atribui IDs aos registros
        const recordsWithId = records.map((r, i) => ({ ...r, id: r.id || `proj-${period}-${i}-${Date.now()}` }));

        const existing = state.months[period];
        const monthData = { ...(existing || computeMonthData(undefined, period)), projecao: recordsWithId };
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

        const recordsWithId = records.map((r, i) => ({ ...r, id: r.id || `ext-${period}-${i}-${Date.now()}` }));

        const existing = state.months[period];
        const monthData = { ...(existing || computeMonthData(undefined, period)), extrato: recordsWithId };
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

      travarMes: (period, senha) => {
        if (senha !== SENHA_DIRETORIA) return false;
        const state = get();
        const month = state.months[period];
        if (!month) return false;
        set({
          months: {
            ...state.months,
            [period]: { ...month, travado: true, travadoEm: new Date().toISOString(), status: 'travado' },
          },
        });
        return true;
      },

      destravarMes: (period, senha) => {
        if (senha !== SENHA_DIRETORIA) return false;
        const state = get();
        const month = state.months[period];
        if (!month) return false;
        const updated = { ...month, travado: false, travadoEm: undefined, status: resolveStatus({ ...month, travado: false }) as MonthData['status'] };
        set({ months: { ...state.months, [period]: updated } });
        return true;
      },

      addObservacaoProjecao: (period, recordIndex, texto) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const projecao = [...month.projecao];
        projecao[recordIndex] = { ...projecao[recordIndex], observacao: texto };
        set({ months: { ...state.months, [period]: { ...month, projecao } } });
      },

      addObservacaoExtrato: (period, recordIndex, texto) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const extrato = [...month.extrato];
        extrato[recordIndex] = { ...extrato[recordIndex], observacao: texto };
        set({ months: { ...state.months, [period]: { ...month, extrato } } });
      },

      addAnexoExtrato: (period, recordIndex, anexo) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const extrato = [...month.extrato];
        const existing = extrato[recordIndex].anexos || [];
        if (existing.length >= 2 && anexo.tipo === 'imagem') return; // max 2 imagens
        extrato[recordIndex] = { ...extrato[recordIndex], anexos: [...existing, anexo] };
        set({ months: { ...state.months, [period]: { ...month, extrato } } });
      },

      addAnexoProjecao: (period, recordIndex, anexo) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const projecao = [...month.projecao];
        const existing = projecao[recordIndex].anexos || [];
        if (existing.length >= 2 && anexo.tipo === 'imagem') return;
        projecao[recordIndex] = { ...projecao[recordIndex], anexos: [...existing, anexo] };
        set({ months: { ...state.months, [period]: { ...month, projecao } } });
      },

      addDetalheExtrato: (period, recordIndex, detalhe) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const extrato = [...month.extrato];
        const existing = extrato[recordIndex].detalhes || [];
        extrato[recordIndex] = { ...extrato[recordIndex], detalhes: [...existing, detalhe] };
        set({ months: { ...state.months, [period]: { ...month, extrato } } });
      },

      removeDetalheExtrato: (period, recordIndex, detalheId) => {
        const state = get();
        const month = state.months[period];
        if (!month || month.travado) return;
        const extrato = [...month.extrato];
        extrato[recordIndex] = {
          ...extrato[recordIndex],
          detalhes: (extrato[recordIndex].detalhes || []).filter(d => d.id !== detalheId),
        };
        set({ months: { ...state.months, [period]: { ...month, extrato } } });
      },

      getInadimplentes: (period) => {
        const month = get().months[period];
        if (!month) return [];
        return month.projecao.filter(r => r.situacao === 'Aberto');
      },
    }),
    {
      name: 'conciliacao-financeira',
      version: 2,
    }
  )
);
