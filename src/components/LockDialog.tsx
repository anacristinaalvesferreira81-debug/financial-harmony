import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  action: 'travar' | 'destravar';
  onConfirm: (senha: string) => boolean;
}

export function LockDialog({ open, onClose, action, onConfirm }: Props) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  const handleConfirm = () => {
    const ok = onConfirm(senha);
    if (!ok) {
      setErro(true);
      setTimeout(() => setErro(false), 2000);
    } else {
      setSenha('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { setSenha(''); setErro(false); onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {action === 'travar' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {action === 'travar' ? 'Gravar e Travar Mês' : 'Destravar Mês'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            {action === 'travar'
              ? 'Ao travar, os dados não poderão ser alterados sem autorização da diretoria.'
              : 'Informe a senha de diretoria para destravar este mês.'}
          </p>
          <Input
            type="password"
            placeholder="Senha de diretoria"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            className={erro ? 'border-destructive' : ''}
          />
          {erro && <p className="text-xs text-destructive">Senha incorreta</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleConfirm} disabled={!senha}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
