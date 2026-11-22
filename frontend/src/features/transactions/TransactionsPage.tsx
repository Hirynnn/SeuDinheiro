import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Plus, Filter, CheckCircle2, Trash2 } from 'lucide-react';

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form de novo lançamento
  const [form, setForm] = useState({
    type: 'EXPENSE',
    description: '',
    amount: '',
    financialAccountId: '',
    categoryId: '',
    competenceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    status: 'PAID',
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => api.get<any[]>('/accounts').then((r) => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api.get<any[]>('/categories').then((r) => r.data),
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions-list', filterType],
    queryFn: () => {
      const q = filterType ? `?type=${filterType}` : '';
      return api.get<any>(`/transactions${q}`).then((r) => r.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (newTx: any) => api.post('/transactions', newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      setIsModalOpen(false);
      setForm({
        type: 'EXPENSE',
        description: '',
        amount: '',
        financialAccountId: '',
        categoryId: '',
        competenceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        status: 'PAID',
      });
    },
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/transactions/${id}/settle`, {
        paymentDate: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId || undefined,
    });
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos Financeiros</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento completo de receitas e despesas com conciliação automática
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
            filterType === '' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterType('REVENUE')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
            filterType === 'REVENUE' ? 'bg-emerald-600 text-white' : 'bg-card'
          }`}
        >
          Receitas
        </button>
        <button
          onClick={() => setFilterType('EXPENSE')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
            filterType === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-card'
          }`}
        >
          Despesas
        </button>
      </div>

      {/* Tabela de Lançamentos */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase bg-muted/40">
            <tr>
              <th className="py-3 px-4">Data</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Conta</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Valor</th>
              <th className="py-3 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando lançamentos...
                </td>
              </tr>
            ) : transactionsData?.items?.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              transactionsData?.items?.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(tx.competenceDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 font-medium">{tx.description}</td>
                  <td className="py-3 px-4 text-muted-foreground">{tx.category?.name || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{tx.financialAccount?.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        tx.status === 'PAID' || tx.status === 'RECEIVED'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : tx.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold ${
                      tx.type === 'REVENUE' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'REVENUE' ? '+' : '-'} {fmtCurrency(Math.abs(Number(tx.amount)))}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {tx.status === 'PENDING' && (
                        <button
                          onClick={() => settleMutation.mutate(tx.id)}
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Dar baixa (efetivar pagamento/recebimento)"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(tx.id)}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Cancelar lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4">Novo Lançamento Financeiro</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'EXPENSE', status: 'PAID' })}
                  className={`py-2 text-xs font-semibold rounded-md border ${
                    form.type === 'EXPENSE' ? 'bg-rose-600 text-white' : 'bg-muted'
                  }`}
                >
                  Despesa (Saída)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'REVENUE', status: 'RECEIVED' })}
                  className={`py-2 text-xs font-semibold rounded-md border ${
                    form.type === 'REVENUE' ? 'bg-emerald-600 text-white' : 'bg-muted'
                  }`}
                >
                  Receita (Entrada)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Ex: Fornecedor de papelaria"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="PAID">Pago / Efetivado</option>
                    <option value="PENDING">Pendente (Previsão)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Conta Financeira</label>
                  <select
                    required
                    value={form.financialAccountId}
                    onChange={(e) => setForm({ ...form, financialAccountId: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {accountsData?.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Categoria</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {categoriesData?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Competência</label>
                  <input
                    type="date"
                    required
                    value={form.competenceDate}
                    onChange={(e) => setForm({ ...form, competenceDate: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Vencimento</label>
                  <input
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>
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
                  {createMutation.isPending ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
