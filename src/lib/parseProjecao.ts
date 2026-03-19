import * as XLSX from 'xlsx';
import type { ProjecaoRecord } from '@/types/financial';

export function parseProjecaoXLSX(data: ArrayBuffer): { records: ProjecaoRecord[]; period: string } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (row && row.some((cell: any) => String(cell).toUpperCase().includes('UNIDADE'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return { records: [], period: '' };

  const headers = rows[headerIdx].map((h: any) => String(h).trim().toUpperCase());
  const colMap: Record<string, number> = {};
  const mapping: Record<string, string[]> = {
    unidade: ['UNIDADE'],
    cliente: ['CLIENTE'],
    cpfCnpj: ['CPF/CNPJ', 'CPF', 'CNPJ'],
    dataVencimento: ['DATA DE VENCIMENTO'],
    valorTitulo: ['VALOR DO TÍTULO', 'VALOR DO TITULO'],
    valorPago: ['VALOR PAGO'],
    situacao: ['SITUAÇÃO', 'SITUACAO'],
    dataLiquidacao: ['DATA DE LIQUIDAÇÃO', 'DATA DE LIQUIDACAO'],
    despesas: ['DESPESAS'],
    valorLiquido: ['VALOR LÍQUIDO', 'VALOR LIQUIDO'],
    descricao: ['DESCRIÇÃO', 'DESCRICAO'],
    tipoLiquidacao: ['TIPO DE LIQUIDAÇÃO', 'TIPO DE LIQUIDACAO'],
  };

  for (const [key, aliases] of Object.entries(mapping)) {
    for (const alias of aliases) {
      const idx = headers.findIndex(h => h.includes(alias));
      if (idx !== -1) { colMap[key] = idx; break; }
    }
  }

  const records: ProjecaoRecord[] = [];
  let period = '';

  // Extract period from metadata rows
  for (let i = 0; i < headerIdx; i++) {
    const row = rows[i];
    if (row) {
      const text = row.join(' ');
      const match = text.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (match && !period) {
        const [, m, , y] = match[1].match(/(\d{2})\/(\d{2})\/(\d{4})/) || [];
        period = `${m}/${y}`;
      }
    }
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => !c && c !== 0)) continue;
    
    const cliente = row[colMap.cliente];
    if (!cliente || String(cliente).trim() === '') continue;
    if (String(cliente).toUpperCase().includes('TOTAL')) continue;

    const parseNum = (val: any) => {
      if (!val && val !== 0) return 0;
      const s = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      return parseFloat(s) || 0;
    };

    const parseDate = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val);
        if (date) return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`;
      }
      return String(val);
    };

    const dvenc = parseDate(row[colMap.dataVencimento]);
    if (dvenc && !period) {
      const m = dvenc.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) period = `${m[2]}/${m[3]}`;
    }

    records.push({
      unidade: String(row[colMap.unidade] || '').trim(),
      cliente: String(cliente).trim(),
      cpfCnpj: String(row[colMap.cpfCnpj] || '').trim(),
      dataVencimento: dvenc,
      valorTitulo: parseNum(row[colMap.valorTitulo]),
      valorPago: parseNum(row[colMap.valorPago]),
      situacao: String(row[colMap.situacao] || '').includes('Liquidado') ? 'Liquidado' : 'Aberto',
      dataLiquidacao: parseDate(row[colMap.dataLiquidacao]),
      despesas: parseNum(row[colMap.despesas]),
      valorLiquido: parseNum(row[colMap.valorLiquido]),
      descricao: String(row[colMap.descricao] || '').trim(),
      tipoLiquidacao: String(row[colMap.tipoLiquidacao] || '').trim(),
    });
  }

  return { records, period };
}
