import { useState } from 'react';
import { MessageSquare, Paperclip, Plus, SplitSquareVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Anexo, DetalheValor, TipoAnexo } from '@/types/financial';

const TIPO_ANEXO_LABELS: Record<TipoAnexo, string> = {
  nf: 'NF',
  cupom_fiscal: 'Cupom Fiscal',
  comprovante: 'Comprovante',
  termo_ressarcimento: 'Termo Ressarcimento',
  justificativa: 'Justificativa',
  imagem: 'Imagem',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Props {
  observacao?: string;
  anexos?: Anexo[];
  detalhes?: DetalheValor[];
  travado: boolean;
  onObservacao: (texto: string) => void;
  onAnexo: (anexo: Anexo) => void;
  onDetalhe?: (detalhe: DetalheValor) => void;
  showDetalhes?: boolean;
}

export function TransactionObservacao({ observacao, anexos, detalhes, travado, onObservacao, onAnexo, onDetalhe, showDetalhes }: Props) {
  const [editing, setEditing] = useState(false);
  const [obsText, setObsText] = useState(observacao || '');
  const [addingDetalhe, setAddingDetalhe] = useState(false);
  const [detDesc, setDetDesc] = useState('');
  const [detValor, setDetValor] = useState('');

  const handleSaveObs = () => {
    onObservacao(obsText);
    setEditing(false);
  };

  const handleFileSelect = (tipo: TipoAnexo) => {
    if (travado) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = tipo === 'imagem' ? 'image/*' : '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onAnexo({
          id: crypto.randomUUID(),
          tipo,
          nome: file.name,
          dataUrl: reader.result as string,
          criadoEm: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAddDetalhe = () => {
    if (!onDetalhe || !detDesc.trim()) return;
    const valor = parseFloat(detValor.replace(/\./g, '').replace(',', '.')) || 0;
    onDetalhe({ id: crypto.randomUUID(), descricao: detDesc.trim(), valor });
    setDetDesc('');
    setDetValor('');
    setAddingDetalhe(false);
  };

  return (
    <div className="mt-1.5 space-y-1.5 pl-5">
      {/* Observação */}
      {!editing && observacao && (
        <p className="text-[10px] text-muted-foreground italic cursor-pointer" onClick={() => !travado && setEditing(true)}>
          {observacao}
        </p>
      )}
      {editing && !travado && (
        <div className="flex gap-1.5 items-center">
          <Input
            value={obsText}
            onChange={e => setObsText(e.target.value)}
            placeholder="Observação curta..."
            className="h-6 text-[10px] flex-1"
            onKeyDown={e => e.key === 'Enter' && handleSaveObs()}
          />
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleSaveObs}>OK</Button>
        </div>
      )}

      {/* Ações inline */}
      {!travado && (
        <div className="flex items-center gap-1 flex-wrap">
          {!editing && !observacao && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground">
              <MessageSquare className="w-2.5 h-2.5" /> Obs
            </button>
          )}
          {Object.entries(TIPO_ANEXO_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => handleFileSelect(key as TipoAnexo)} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground">
              <Paperclip className="w-2.5 h-2.5" /> {label}
            </button>
          ))}
          {showDetalhes && onDetalhe && (
            <button onClick={() => setAddingDetalhe(true)} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground">
              <SplitSquareVertical className="w-2.5 h-2.5" /> Discriminar
            </button>
          )}
        </div>
      )}

      {/* Anexos existentes */}
      {(anexos || []).length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {anexos!.map(a => (
            <span key={a.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-[9px] text-muted-foreground">
              <Paperclip className="w-2.5 h-2.5" />
              {TIPO_ANEXO_LABELS[a.tipo]}: {a.nome}
            </span>
          ))}
        </div>
      )}

      {/* Detalhes / Discriminação */}
      {addingDetalhe && (
        <div className="flex gap-1.5 items-center">
          <Input value={detDesc} onChange={e => setDetDesc(e.target.value)} placeholder="Descrição" className="h-6 text-[10px] flex-1" />
          <Input value={detValor} onChange={e => setDetValor(e.target.value)} placeholder="Valor" className="h-6 text-[10px] w-24" />
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={handleAddDetalhe}>OK</Button>
        </div>
      )}
      {(detalhes || []).length > 0 && (
        <div className="space-y-0.5">
          {detalhes!.map(d => (
            <p key={d.id} className="text-[9px] text-muted-foreground pl-2 border-l border-border">
              {d.descricao}: {formatCurrency(d.valor)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
