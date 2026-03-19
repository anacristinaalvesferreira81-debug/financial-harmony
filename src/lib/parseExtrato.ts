import type { ExtratoRecord } from '@/types/financial';

interface TextItem {
  str: string;
  x: number;
  y: number;
}

interface TableRow {
  date: string;
  historico: string;
  valor: string;
  y: number;
}

function groupIntoRows(items: TextItem[], yTolerance = 4): TextItem[][] {
  const rowMap = new Map<number, TextItem[]>();
  for (const item of items) {
    const roundedY = Math.round(item.y / yTolerance) * yTolerance;
    if (!rowMap.has(roundedY)) rowMap.set(roundedY, []);
    rowMap.get(roundedY)!.push(item);
  }
  return Array.from(rowMap.entries())
    .sort((a, b) => b[0] - a[0]) // top to bottom (higher Y = top in PDF)
    .map(([, items]) => items.sort((a, b) => a.x - b.x));
}

function parseRowsToRecords(rows: TextItem[][], year: number): ExtratoRecord[] {
  const records: ExtratoRecord[] = [];
  let currentDate = '';
  let currentHistorico = '';
  let currentValor = 0;
  let currentTipo: 'D' | 'C' = 'D';
  let hasPending = false;

  for (const row of rows) {
    const texts = row.map(i => i.str.trim()).filter(Boolean);
    const fullLine = texts.join(' ');

    // Skip empty or header lines
    if (!fullLine || fullLine.includes('DATA') && fullLine.includes('HIST')) continue;
    if (fullLine.includes('SICOOB') || fullLine.includes('SISBR') || fullLine.includes('Página')) continue;
    if (fullLine.match(/^[-|=\s]+$/)) continue;

    // Check if this row starts with a date (dd/mm)
    const dateMatch = fullLine.match(/^(\d{2}\/\d{2})\b/);

    if (dateMatch) {
      // Save previous record if exists
      if (hasPending && currentHistorico && !currentHistorico.toUpperCase().includes('SALDO')) {
        const [day, month] = currentDate.split('/');
        records.push({
          data: `${day}/${month}/${year}`,
          historico: currentHistorico.trim(),
          valor: currentValor,
          tipo: currentTipo,
        });
      }

      currentDate = dateMatch[1];
      // Remove date from line to get the rest
      const rest = fullLine.substring(dateMatch[0].length).trim();

      // Try to extract valor from the end
      const valorMatch = rest.match(/([\d.,]+)\s*([DC])?\s*$/);
      if (valorMatch) {
        const hist = rest.substring(0, rest.lastIndexOf(valorMatch[0])).trim();
        currentHistorico = hist;
        currentValor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        currentTipo = valorMatch[2] === 'C' ? 'C' : 'D';
      } else {
        currentHistorico = rest;
        currentValor = 0;
        currentTipo = 'D';
      }
      hasPending = true;
    } else if (hasPending) {
      // Continuation line — check if it has a value (might be a split row)
      const valorMatch = fullLine.match(/([\d.,]+)\s*([DC])?\s*$/);
      if (valorMatch && !currentValor && fullLine.replace(valorMatch[0], '').trim().length > 0) {
        const hist = fullLine.substring(0, fullLine.lastIndexOf(valorMatch[0])).trim();
        currentHistorico += ' ' + hist;
        currentValor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        currentTipo = valorMatch[2] === 'C' ? 'C' : 'D';
      } else {
        // Just description continuation
        const cleanLine = fullLine.replace(/^DOC\.:.*$/i, '').trim();
        if (cleanLine && !cleanLine.match(/^\*+$/) && !cleanLine.match(/^0,00\*?$/)) {
          // Add meaningful details
          if (!cleanLine.startsWith('DOC.:') && cleanLine.length > 2) {
            currentHistorico += ' — ' + cleanLine;
          }
        }
      }
    }
  }

  // Don't forget last record
  if (hasPending && currentHistorico && !currentHistorico.toUpperCase().includes('SALDO')) {
    const [day, month] = currentDate.split('/');
    records.push({
      data: `${day}/${month}/${year}`,
      historico: currentHistorico.trim(),
      valor: currentValor,
      tipo: currentTipo,
    });
  }

  return records;
}

export function parseExtratoPDF(text: string): { records: ExtratoRecord[]; period: string } {
  let period = '';

  // Extract period
  const periodMatch = text.match(/PER[IÍ]ODO[:\s]*(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (periodMatch) {
    const m = periodMatch[1].match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) period = `${m[2]}/${m[3]}`;
  }

  let year = new Date().getFullYear();
  if (periodMatch) {
    const m = periodMatch[1].match(/(\d{4})/);
    if (m) year = parseInt(m[1]);
  }

  // Parse the raw text line-by-line (already reconstructed from coordinates)
  const lines = text.split('\n').filter(l => l.trim());
  const records: ExtratoRecord[] = [];
  let currentDate = '';
  let currentHistorico = '';
  let currentValor = 0;
  let currentTipo: 'D' | 'C' = 'D';
  let hasPending = false;

  const flush = () => {
    if (hasPending && currentHistorico && !currentHistorico.toUpperCase().includes('SALDO')) {
      if (currentDate && currentValor > 0) {
        const [day, month] = currentDate.split('/');
        records.push({
          data: `${day}/${month}/${year}`,
          historico: currentHistorico.replace(/\s+/g, ' ').trim(),
          valor: currentValor,
          tipo: currentTipo,
        });
      }
    }
    hasPending = false;
    currentHistorico = '';
    currentValor = 0;
    currentTipo = 'D';
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip headers/noise
    if (/^(SICOOB|SISTEMA|PLATAFORMA|COOP|CONTA|Data:|Hora:|EXTRATO|HIST)/i.test(trimmed)) continue;
    if (/^[-|=\s]+$/.test(trimmed)) continue;

    // Check for date at start
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2})\s+(.+)/);
    if (dateMatch) {
      flush(); // save previous
      currentDate = dateMatch[1];
      const rest = dateMatch[2];

      // Extract valor (number with comma at end, possibly with D/C)
      const valorMatch = rest.match(/([\d]+[.,][\d]{2})\s*([DC])?\s*$/);
      if (valorMatch) {
        currentHistorico = rest.substring(0, rest.lastIndexOf(valorMatch[1])).trim();
        currentValor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        currentTipo = valorMatch[2] === 'C' ? 'C' : 'D';
      } else {
        currentHistorico = rest;
      }
      hasPending = true;
    } else if (hasPending) {
      // Continuation line
      const cleanLine = trimmed
        .replace(/^\|?\s*\|?\s*/, '')
        .replace(/\s*\|?\s*$/, '')
        .trim();

      if (!cleanLine || cleanLine.match(/^[-=]+$/) || cleanLine === '|') continue;

      // Check if continuation has a valor
      const valorMatch = cleanLine.match(/([\d]+[.,][\d]{2})\s*([DC])?\s*$/);
      if (valorMatch && !currentValor) {
        const hist = cleanLine.substring(0, cleanLine.lastIndexOf(valorMatch[1])).trim();
        if (hist) currentHistorico += ' ' + hist;
        currentValor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        currentTipo = valorMatch[2] === 'C' ? 'C' : 'D';
      } else if (!cleanLine.startsWith('DOC.:') && cleanLine.length > 2 && !cleanLine.match(/^0,00/)) {
        // Append as description detail (limit to keep it readable)
        if (currentHistorico.split('—').length < 3) {
          currentHistorico += ' — ' + cleanLine;
        }
      }
    }
  }
  flush(); // last record

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

    const items: TextItem[] = (textContent.items as any[])
      .filter(item => item.str && item.str.trim())
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
      }));

    // Group items into rows by Y coordinate
    const rows = groupIntoRows(items);

    for (const row of rows) {
      const lineText = row.map(item => item.str).join(' ');
      fullText += lineText.trim() + '\n';
    }
    fullText += '\n';
  }

  return fullText;
}
