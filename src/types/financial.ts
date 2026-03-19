export type ReceitaCategoria = 'mensalidade' | 'cota_participativa' | 'adesao' | 'taxa_extra' | 'outros';

export const RECEITA_CATEGORIAS: Record<ReceitaCategoria, string> = {
  mensalidade: 'Mensalidade',
  cota_participativa: 'Cota Participativa',
  adesao: 'Adesão',
  taxa_extra: 'Taxa Extra',
  outros: 'Outros',
};

export type TipoAnexo = 'nf' | 'cupom_fiscal' | 'comprovante' | 'termo_ressarcimento' | 'justificativa' | 'imagem';

export interface Anexo {
  id: string;
  tipo: TipoAnexo;
  nome: string;
  dataUrl: string; // base64 para localStorage, URL para DB futuro
  criadoEm: string;
}

export interface Observacao {
  id: string;
  texto: string;
  criadoEm: string;
}

export interface DetalheValor {
  id: string;
  descricao: string;
  valor: number;
}

export interface ProjecaoRecord {
  id?: string;
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
  categoria?: ReceitaCategoria;
  observacao?: string;
  anexos?: Anexo[];
}

export interface ExtratoRecord {
  id?: string;
  data: string;
  historico: string;
  valor: number;
  tipo: 'D' | 'C';
  observacao?: string;
  detalhes?: DetalheValor[]; // para discriminar valores grandes
  anexos?: Anexo[];
}

export type MonthStatus = 'aguardando_projecao' | 'aguardando_extrato' | 'pronto_conciliacao' | 'conciliado' | 'travado';

export interface MonthData {
  month: string; // "03/2025"
  year: number;
  monthNum: number;
  status: MonthStatus;
  projecao: ProjecaoRecord[];
  extrato: ExtratoRecord[];
  totalPrevisto: number;
  totalRecebido: number;
  totalInadimplencia: number;
  totalSaidas: number;
  totalEntradas: number;
  saldoReal: number;
  travado: boolean;
  travadoEm?: string;
  travadoPor?: string;
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
