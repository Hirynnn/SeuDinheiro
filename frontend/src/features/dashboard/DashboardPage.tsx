import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get<any>('/dashboard/overview').then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground animate-pulse text-sm">
          Carregando indicadores financeiros...
        </div>
      </div>
    );
  }

  const { summary, charts, recentTransactions } = data || {
    summary: { totalBalance: 0, monthlyRevenue: 0, monthlyExpense: 0, netResult: 0, payables: { total: 0, overdue: 0 }, receivables: { total: 0, overdue: 0 } },
    charts: { expensesByCategory: [], revenuesByCategory: [], monthlyEvolution: [] },
    recentTransactions: [],
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada da saúde financeira da sua empresa neste mês
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Saldo Total */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Saldo em Contas</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {fmtCurrency(summary.totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Disponível em todas as contas</p>
        </div>

        {/* Receitas do Mês */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Receitas no Mês</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {fmtCurrency(summary.monthlyRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Efetivadas neste mês</p>
        </div>

        {/* Despesas do Mês */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Despesas no Mês</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {fmtCurrency(summary.monthlyExpense)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pagas neste mês</p>
        </div>

        {/* Resultado Líquido */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Resultado Operacional</span>
            <Scale className="w-4 h-4 text-blue-500" />
          </div>
          <div
            className={`text-2xl font-bold ${
              summary.netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fmtCurrency(summary.netResult)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.netResult >= 0 ? 'Superávit no período' : 'Déficit no período'}
          </p>
        </div>
      </div>

      {/* Contas a Pagar e Receber */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contas a Receber (Previsto)</p>
              <p className="text-lg font-bold">{fmtCurrency(summary.receivables.total)}</p>
            </div>
          </div>
          {summary.receivables.overdue > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-md font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{fmtCurrency(summary.receivables.overdue)} vencidas</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contas a Pagar (Obrigações)</p>
              <p className="text-lg font-bold">{fmtCurrency(summary.payables.total)}</p>
            </div>
          </div>
          {summary.payables.overdue > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-500/10 px-2.5 py-1 rounded-md font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{fmtCurrency(summary.payables.overdue)} vencidas</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução Mensal */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold mb-4">Evolução Financeira (Últimos Meses)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="month" textAnchor="end" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: any) => fmtCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold mb-4">Despesas por Categoria</h2>
          {charts.expensesByCategory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
              Nenhuma despesa registrada no mês
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.expensesByCategory}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {charts.expensesByCategory.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => fmtCurrency(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Lançamentos Recentes */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold mb-4">Lançamentos Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground uppercase bg-muted/40">
              <tr>
                <th className="py-2.5 px-4">Descrição</th>
                <th className="py-2.5 px-4">Categoria</th>
                <th className="py-2.5 px-4">Conta</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentTransactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
