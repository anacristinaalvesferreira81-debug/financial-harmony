import type { ExtratoRecord } from '@/types/financial';

export function parseExtratoPDF(text: string): { records: ExtratoRecord[]; period: string } {
  const records: ExtratoRecord[] = [];
  let period = '';

  // Extract period from header - try multiple patterns
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

  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Match date pattern at start: "05/03" or "| 05/03 |"
    const dateMatch = line.match(/\|?\s*(\d{2}\/\d{2})\s*\|/);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    
    // Extract historico and valor from the same line
    // Pattern: | DATE | HISTORICO | VALOR |
    const fullMatch = line.match(/\|\s*\d{2}\/\d{2}\s*\|\s*(.+?)\s*\|\s*([\d.,]+)\s*([DC])?\s*\|?/);
    if (!fullMatch) continue;

    let historico = fullMatch[1].trim();
    const valorStr = fullMatch[2];
    const tipoStr = fullMatch[3];

    // Skip SALDO lines
    if (historico.toUpperCase().includes('SALDO')) continue;

    // Collect continuation lines (lines with empty date column that follow)
    const extraDetails: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const nextLine = lines[j].trim();
      if (!nextLine) continue;
      // Check if next line has a date (new transaction) or is a continuation
      if (/\|\s*\d{2}\/\d{2}\s*\|/.test(nextLine)) break;
      // Continuation line: | | description | |
      const contMatch = nextLine.match(/\|?\s*\|\s*(.+?)\s*\|/);
      if (contMatch) {
        const detail = contMatch[1].trim();
        if (detail && !detail.match(/^\s*$/)) {
          extraDetails.push(detail);
        }
      } else {
        // Non-table line, could be description text between tables
        const cleanLine = nextLine.replace(/\|/g, '').trim();
        if (cleanLine && !cleanLine.match(/^[-=]+$/) && cleanLine.length > 2) {
          extraDetails.push(cleanLine);
        }
      }
      // Stop if we hit another table header or page break
      if (nextLine.includes('DATA') && nextLine.includes('HIST')) break;
      if (nextLine.includes('Página') || nextLine.includes('SICOOB')) break;
    }

    // Append relevant details to historico
    if (extraDetails.length > 0) {
      // Filter out DOC references and keep meaningful descriptions
      const meaningful = extraDetails.filter(d => 
        !d.startsWith('DOC.:') && 
        !d.match(/^\d+$/) &&
        !d.includes('SALDO')
      );
      if (meaningful.length > 0) {
        historico += ' — ' + meaningful.slice(0, 2).join(', ');
      }
    }

    const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || 0;
    // Default to D (débito/saída) if no indicator - most bank statements show expenses
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
    
    // Build text with position awareness for table structure
    const items = textContent.items as any[];
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]; // Y position (top to bottom)
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.transform[4] - b.transform[4]; // X position (left to right)
    });

    let lastY = -1;
    let lineText = '';
    
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== -1 && Math.abs(y - lastY) > 5) {
        fullText += lineText.trim() + '\n';
        lineText = '';
      }
      lineText += item.str + ' ';
      lastY = y;
    }
    if (lineText.trim()) {
      fullText += lineText.trim() + '\n';
    }
    fullText += '\n';
  }

  return fullText;
}
