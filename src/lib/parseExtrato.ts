import type { ExtratoRecord } from '@/types/financial';

export function parseExtratoPDF(text: string): { records: ExtratoRecord[]; period: string } {
  const records: ExtratoRecord[] = [];
  let period = '';

  // Extract period from header
  const periodMatch = text.match(/PERÍODO:\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    const [, m, , y] = periodMatch[1].match(/(\d{2})\/(\d{2})\/(\d{4})/) || [];
    period = `${m}/${y}`;
  }

  // Extract year from period
  let year = new Date().getFullYear();
  if (periodMatch) {
    const m = periodMatch[1].match(/(\d{4})/);
    if (m) year = parseInt(m[1]);
  }

  const lines = text.split('\n');

  for (const line of lines) {
    // Match patterns like: | 03/02 | DESCRIPTION | 40,00 D |
    // or: 03/02 DESCRIPTION 40,00 D
    const tableMatch = line.match(/\|?\s*(\d{2}\/\d{2})\s*\|\s*(.+?)\s*\|\s*([\d.,]+)\s*([DC])?\s*\|?/);
    const plainMatch = line.match(/^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s+([DC])\s*$/);

    const match = tableMatch || plainMatch;
    if (!match) continue;

    const [, dateStr, historico, valorStr, tipoStr] = match;

    // Skip "SALDO" lines
    if (historico.toUpperCase().includes('SALDO')) continue;

    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || 0;
    const tipo = (tipoStr === 'C' ? 'C' : 'D') as 'D' | 'C';

    const [day, month] = dateStr.split('/');
    const fullDate = `${day}/${month}/${year}`;

    records.push({
      data: fullDate,
      historico: historico.trim(),
      valor,
      tipo,
    });
  }

  return { records, period };
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}
