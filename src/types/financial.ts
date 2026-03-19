export interface ProjecaoRecord {
  unidade: string;
  cliente: string;
  cpfCnpj: string;
  dataVencimento: string;
  valorTitulo: number;
  valorPago: number;
  situacao: 'Liquidado' | 'Aberto';
  dataLiquidacao: string;
  despesas: number;
  valorLiquido: number;
  descricao: string;
  tipoLiquidacao: string;
}

export interface ExtratoRecord {
  data: string;
  historico: string;
  valor: number;
  tipo: 'D' | 'C'; // Débito ou Crédito
}

export interface MonthData {
  month: string; // "09/2025"
  year: number;
  monthNum: number;
  projecao: ProjecaoRecord[];
  extrato: ExtratoRecord[];
  totalPrevisto: number;
  totalRecebido: number;
  totalInadimplencia: number;
  totalSaidas: number;
  totalEntradas: number;
  saldoReal: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'projecao' | 'extrato';
  uploadDate: string;
  period: string;
  recordCount: number;
  status: 'processed' | 'error' | 'duplicate';
}

export interface DailySummary {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
  transacoes: (ProjecaoRecord | ExtratoRecord)[];
}
