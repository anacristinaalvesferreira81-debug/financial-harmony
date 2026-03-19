import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Clock, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { UploadedFile } from '@/types/financial';
import { useFinancialStore } from '@/stores/financialStore';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  files: UploadedFile[];
}

export function UploadedFilesList({ files }: Props) {
  const { uploadedFiles, removeUploadedFile, months } = useFinancialStore();
  const [confirmDelete, setConfirmDelete] = useState<UploadedFile | null>(null);

  const periodsStatus = useMemo(() => {
    const map: Record<string, { projecao: boolean; extrato: boolean }> = {};
    uploadedFiles.forEach(f => {
      if (!map[f.period]) map[f.period] = { projecao: false, extrato: false };
      map[f.period][f.type] = true;
    });
    return map;
  }, [uploadedFiles]);

  if (files.length === 0) return null;

  const handleDelete = () => {
    if (confirmDelete) {
      removeUploadedFile(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Arquivos processados
      </h4>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {files.map((file, i) => {
          const ps = periodsStatus[file.period];
          const hasComplement = ps ? (file.type === 'projecao' ? ps.extrato : ps.projecao) : false;
          const monthData = months[file.period];
          const isLocked = monthData?.travado ?? false;

          return (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 text-sm group"
            >
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {file.type === 'projecao' ? (
                  <FileSpreadsheet className="w-4 h-4 text-income" />
                ) : (
                  <FileText className="w-4 h-4 text-expense" />
                )}
                {file.type === 'projecao' ? (
                  <ArrowDownCircle className="w-3 h-3 text-income" />
                ) : (
                  <ArrowUpCircle className="w-3 h-3 text-expense" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-card-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {file.period} · {file.recordCount} reg · {file.type === 'projecao' ? (
                    <span className="text-income font-medium">Entrada (Projeção)</span>
                  ) : (
                    <span className="text-expense font-medium">Saída (Extrato)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {file.status === 'duplicate' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-overdue" />
                ) : hasComplement ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-income" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-overdue" />
                )}
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDelete(file)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-income" /> Completo</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-overdue" /> Falta complemento</span>
        <span className="flex items-center gap-1"><ArrowDownCircle className="w-3 h-3 text-income" /> Entrada</span>
        <span className="flex items-center gap-1"><ArrowUpCircle className="w-3 h-3 text-expense" /> Saída</span>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{confirmDelete?.name}</strong>?
              {confirmDelete?.type === 'projecao'
                ? ' Isso removerá todos os dados de projeção (entrada) deste mês.'
                : ' Isso removerá todos os dados de extrato (saída) deste mês.'}
              <br /><br />
              Os dados do complemento, se existirem, serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
