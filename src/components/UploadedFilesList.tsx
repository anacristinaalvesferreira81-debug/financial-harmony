import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, CheckCircle2, Clock } from 'lucide-react';
import type { UploadedFile } from '@/types/financial';

interface Props {
  files: UploadedFile[];
}

export function UploadedFilesList({ files }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Arquivos processados
      </h4>
      <div className="space-y-1.5">
        {files.map((file, i) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 text-sm"
          >
            {file.type === 'projecao' ? (
              <FileSpreadsheet className="w-4 h-4 text-income flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-expense flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-card-foreground truncate">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {file.period} · {file.recordCount} registros
              </p>
            </div>
            <CheckCircle2 className="w-3.5 h-3.5 text-income flex-shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
