import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { UploadedFile } from '@/types/financial';
import { useFinancialStore } from '@/stores/financialStore';
import { useMemo } from 'react';

interface Props {
  files: UploadedFile[];
}

export function UploadedFilesList({ files }: Props) {
  const { uploadedFiles } = useFinancialStore();

  // Group by period and check complement status
  const periodsStatus = useMemo(() => {
    const map: Record<string, { projecao: boolean; extrato: boolean }> = {};
    uploadedFiles.forEach(f => {
      if (!map[f.period]) map[f.period] = { projecao: false, extrato: false };
      map[f.period][f.type] = true;
    });
    return map;
  }, [uploadedFiles]);

  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Arquivos processados
      </h4>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {files.map((file, i) => {
          const ps = periodsStatus[file.period];
          const hasComplement = ps ? (file.type === 'projecao' ? ps.extrato : ps.projecao) : false;

          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 text-sm"
            >
              {file.type === 'projecao' ? (
                <FileSpreadsheet className="w-4 h-4 text-income flex-shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-expense flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-card-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {file.period} · {file.recordCount} reg · {file.type === 'projecao' ? 'Projeção' : 'Extrato'}
                </p>
              </div>
              <div className="flex-shrink-0">
                {file.status === 'duplicate' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-overdue" />
                ) : hasComplement ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-income" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-overdue" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-income" /> Completo</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-overdue" /> Falta complemento</span>
      </div>
    </div>
  );
}
