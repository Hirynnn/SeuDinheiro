import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

export function ReconciliationPage() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadResult, setUploadResult] = useState<any>(null);

  const { data: accounts } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => api.get<any[]>('/accounts').then((r) => r.data),
  });

  const { data: statements } = useQuery({
    queryKey: ['statements-list'],
    queryFn: () => api.get<any[]>('/reconciliation/statements').then((r) => r.data),
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => api.post('/reconciliation/import', data),
    onSuccess: (res: any) => {
      setUploadResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['statements-list'] });
      setCsvText('');
      setFileName('');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !csvText) return;

    importMutation.mutate({
      financialAccountId: selectedAccountId,
      fileName: fileName || 'extrato.csv',
      csvContent: csvText,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conciliação Bancária</h1>
        <p className="text-sm text-muted-foreground">
          Importe arquivos de extrato CSV bancário para conferência e auto-match com lançamentos
        </p>
      </div>

      {/* Formulário de Importação */}
      <div className="rounded-xl border bg-card p-6 shadow-xs max-w-xl">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          Importar Novo Extrato CSV
        </h2>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Conta Financeira do Extrato</label>
            <select
              required
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione a conta...</option>
              {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Arquivo CSV do Banco</label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={handleFileUpload}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={importMutation.isPending || !csvText}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium text-sm disabled:opacity-50"
          >
            {importMutation.isPending ? 'Processando e Conciliando...' : 'Processar Extrato'}
          </button>
        </form>

        {uploadResult && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-sm space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {uploadResult.message}
            </p>
            <p className="text-xs">
              Total de linhas processadas: {uploadResult.totalLines} | Conciliadas automaticamente:{' '}
              {uploadResult.autoMatchedCount}
            </p>
          </div>
        )}
      </div>

      {/* Histórico de Extratos */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-4">Extratos Importados Anteriormente</h2>
        <div className="divide-y text-sm">
          {statements?.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">Nenhum extrato importado ainda.</p>
          ) : (
            statements?.map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Conta: {s.financialAccount?.name} • {s._count?.lines || 0} lançamentos
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.importedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
