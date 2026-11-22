import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';

export function ReportsPage() {
  const { data: dreData, isLoading: isDreLoading } = useQuery({
    queryKey: ['reports-dre'],
    queryFn: () => api.get<any>('/reports/dre').then((r) => r.data),
  });

  const { data: overdueData, isLoading: isOverdueLoading } = useQuery({
    queryKey: ['reports-overdue'],
    queryFn: () => api.get<any>('/reports/overdue').then((r) => r.data),
  });

  const handleDownloadCsv = () => {
    window.open('http://localhost:3000/api/reports/export/csv', '_blank');
  };

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground">
            DRE, relatórios de inadimplência e exportação de dados em planilhas
          </p>
        </div>
        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Lançamentos (CSV / Excel)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DRE Simplificado */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">Demonstração do Resultado (DRE)</h2>
          </div>

          {isDreLoading ? (
            <p className="text-sm text-muted-foreground">Calculando DRE...</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="font-semibold text-emerald-600">Receita Operacional Bruta</span>
                <span className="font-bold text-emerald-600">{fmtCurrency(dreData?.grossRevenue || 0)}</span>
              </div>

              <div className="pl-4 space-y-1 text-xs text-muted-foreground">
                {dreData?.revenues?.map((r: any) => (
                  <div key={r.category} className="flex justify-between">
                    <span>{r.category}</span>
                    <span>{fmtCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-1 border-b pt-3">
                <span className="font-semibold text-rose-600">(-) Despesas e Custos Operacionais</span>
                <span className="font-bold text-rose-600">{fmtCurrency(dreData?.totalExpenses || 0)}</span>
              </div>

              <div className="pl-4 space-y-1 text-xs text-muted-foreground">
                {dreData?.expenses?.map((e: any) => (
                  <div key={e.category} className="flex justify-between">
                    <span>{e.category}</span>
                    <span>{fmtCurrency(e.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-2 border-t-2 border-border font-bold text-base pt-3">
                <span>Resultado Líquido do Exercício</span>
                <span
                  className={
                    (dreData?.netIncome || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }
                >
                  {fmtCurrency(dreData?.netIncome || 0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Relatório de Inadimplência */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-3 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="font-semibold text-base text-foreground">Relatório de Inadimplência</h2>
          </div>

          {isOverdueLoading ? (
            <p className="text-sm text-muted-foreground">Buscando pendências...</p>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Inadimplente</p>
                  <p className="text-xl font-bold text-rose-600">
                    {fmtCurrency(overdueData?.totalOverdue || 0)}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-600 text-white rounded-full">
                  {overdueData?.count || 0} faturas vencidas
                </span>
              </div>

              <div className="divide-y text-sm">
                {overdueData?.customers?.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Nenhum cliente inadimplente no momento. Parabéns!
                  </p>
                ) : (
                  overdueData?.customers?.map((c: any) => (
                    <div key={c.customer} className="py-2.5 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-xs">{c.customer}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.pendingInvoices} fatura(s) pendente(s)
                        </p>
                      </div>
                      <span className="font-semibold text-xs text-rose-600">
                        {fmtCurrency(c.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
