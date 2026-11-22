import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Wallet, Plus, ArrowRightLeft } from 'lucide-react';

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'CHECKING',
    initialBalance: '',
  });

  const [transfer, setTransfer] = useState({
    sourceAccountId: '',
    destinationAccountId: '',
    amount: '',
    notes: '',
  });

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => api.get<any[]>('/accounts').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      setIsModalOpen(false);
      setNewAccount({ name: '', type: 'CHECKING', initialBalance: '' });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/accounts/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-list'] });
      setIsTransferOpen(false);
      setTransfer({ sourceAccountId: '', destinationAccountId: '', amount: '', notes: '' });
    },
  });

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Financeiras</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie contas bancárias, caixas e carteiras com transferências atômicas
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-2 border px-4 py-2 rounded-md font-medium text-sm hover:bg-muted transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transferir Saldo
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      {/* Grid de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando contas...</p>
        ) : (
          accounts?.map((acc: any) => (
            <div key={acc.id} className="rounded-xl border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted uppercase tracking-wider">
                  {acc.type}
                </span>
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base">{acc.name}</h3>
                <p className="text-xs text-muted-foreground">Saldo Disponível</p>
              </div>
              <div className="text-2xl font-extrabold text-foreground">
                {fmtCurrency(Number(acc.currentBalance))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Nova Conta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Adicionar Conta Financeira</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  ...newAccount,
                  initialBalance: parseFloat(newAccount.initialBalance || '0'),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">Nome da Conta</label>
                <input
                  type="text"
                  required
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Ex: Conta Corrente Itaú"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Tipo de Conta</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="CHECKING">Conta Corrente</option>
                  <option value="SAVINGS">Conta Poupança</option>
                  <option value="CASH">Dinheiro em Caixa</option>
                  <option value="WALLET">Carteira Digital</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAccount.initialBalance}
                  onChange={(e) => setNewAccount({ ...newAccount, initialBalance: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="0,00"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm border rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Salvando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transferência Atômica */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Transferência entre Contas</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                transferMutation.mutate({
                  ...transfer,
                  amount: parseFloat(transfer.amount),
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium mb-1">Conta de Origem</label>
                <select
                  required
                  value={transfer.sourceAccountId}
                  onChange={(e) => setTransfer({ ...transfer, sourceAccountId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({fmtCurrency(Number(acc.currentBalance))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Conta de Destino</label>
                <select
                  required
                  value={transfer.destinationAccountId}
                  onChange={(e) =>
                    setTransfer({ ...transfer, destinationAccountId: e.target.value })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione...</option>
                  {accounts
                    ?.filter((a) => a.id !== transfer.sourceAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({fmtCurrency(Number(acc.currentBalance))})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Valor a Transferir (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transfer.amount}
                  onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="0,00"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 text-sm border rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                >
                  {transferMutation.isPending ? 'Transferindo...' : 'Efetuar Transferência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
