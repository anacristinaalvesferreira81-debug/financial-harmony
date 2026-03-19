import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadZoneProps {
  type: 'projecao' | 'extrato';
  onFileProcess: (file: File) => Promise<{ success: boolean; message: string }>;
}

export function FileUploadZone({ type, onFileProcess }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const isProjecao = type === 'projecao';
  const accept = isProjecao ? '.xlsx,.xls' : '.pdf';
  const Icon = isProjecao ? FileSpreadsheet : FileText;

  const handleFile = useCallback(async (file: File) => {
    setProcessing(true);
    setResult(null);
    try {
      const res = await onFileProcess(file);
      setResult(res);
    } catch {
      setResult({ success: false, message: 'Erro ao processar arquivo' });
    }
    setProcessing(false);
    setTimeout(() => setResult(null), 4000);
  }, [onFileProcess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-lg ${isProjecao ? 'bg-income/10' : 'bg-expense/10'}`}>
          <Icon className={`w-4 h-4 ${isProjecao ? 'text-income' : 'text-expense'}`} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">
            {isProjecao ? 'Projeção de Recebíveis' : 'Extrato Bancário'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isProjecao ? 'Arquivo XLSX com contas a receber' : 'Extrato PDF do Sicoob'}
          </p>
        </div>
      </div>

      <label
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
          disabled={processing}
        />

        <AnimatePresence mode="wait">
          {processing ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Processando...</span>
            </motion.div>
          ) : result ? (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="w-8 h-8 text-income" />
              ) : (
                <AlertCircle className="w-8 h-8 text-expense" />
              )}
              <span className={`text-sm font-medium ${result.success ? 'text-income' : 'text-expense'}`}>
                {result.message}
              </span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-secondary">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-card-foreground">
                  Arraste ou clique para enviar
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isProjecao ? 'Formatos: .xlsx, .xls' : 'Formato: .pdf'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </label>
    </div>
  );
}
