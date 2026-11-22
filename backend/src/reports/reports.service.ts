import { Injectable, Res } from '@nestjs/common';
import { Response } from 'express';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DRE — Demonstração do Resultado do Exercício
   */
  async getDre(companyId: string, year: number, month?: number) {
    const startDate = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const endDate = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ['PAID', 'RECEIVED'] },
        competenceDate: { gte: startDate, lte: endDate },
        type: { in: ['REVENUE', 'EXPENSE'] },
      },
      include: {
        category: true,
      },
    });

    const revenuesByCategory = new Map<string, Decimal>();
    const expensesByCategory = new Map<string, Decimal>();
    let totalRevenue = new Decimal(0);
    let totalExpense = new Decimal(0);

    for (const tx of transactions) {
      const amt = new Decimal(tx.amount.toString());
      const cat = tx.category?.name || 'Sem categoria';

      if (tx.type === 'REVENUE') {
        totalRevenue = totalRevenue.plus(amt);
        revenuesByCategory.set(cat, (revenuesByCategory.get(cat) || new Decimal(0)).plus(amt));
      } else {
        totalExpense = totalExpense.plus(amt);
        expensesByCategory.set(cat, (expensesByCategory.get(cat) || new Decimal(0)).plus(amt));
      }
    }

    const netIncome = totalRevenue.minus(totalExpense);

    return {
      period: { year, month: month || 'Ano Completo', startDate, endDate },
      grossRevenue: totalRevenue.toNumber(),
      revenues: Array.from(revenuesByCategory.entries()).map(([name, val]) => ({
        category: name,
        amount: val.toNumber(),
      })),
      totalExpenses: totalExpense.toNumber(),
      expenses: Array.from(expensesByCategory.entries()).map(([name, val]) => ({
        category: name,
        amount: val.toNumber(),
      })),
      netIncome: netIncome.toNumber(),
    };
  }

  /**
   * Relatório de Inadimplência (Contas a Receber vencidas)
   */
  async getOverdueReceivables(companyId: string) {
    const now = new Date();

    const overdueTransactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: 'REVENUE',
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: now },
      },
      include: {
        customer: true,
        category: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    let totalOverdue = new Decimal(0);
    const byCustomer = new Map<string, { customerName: string; total: Decimal; count: number }>();

    for (const item of overdueTransactions) {
      const amt = new Decimal(item.amount.toString());
      totalOverdue = totalOverdue.plus(amt);

      const custKey = item.customerId || 'sem-cliente';
      const custName = item.customer?.name || 'Cliente não identificado';

      const curr = byCustomer.get(custKey) || {
        customerName: custName,
        total: new Decimal(0),
        count: 0,
      };
      curr.total = curr.total.plus(amt);
      curr.count += 1;
      byCustomer.set(custKey, curr);
    }

    return {
      totalOverdue: totalOverdue.toNumber(),
      count: overdueTransactions.length,
      customers: Array.from(byCustomer.values()).map((c) => ({
        customer: c.customerName,
        total: c.total.toNumber(),
        pendingInvoices: c.count,
      })),
      items: overdueTransactions.map((tx) => ({
        id: tx.id,
        description: tx.description,
        customer: tx.customer?.name || '—',
        amount: Number(tx.amount),
        dueDate: tx.dueDate,
        daysOverdue: Math.floor(
          (now.getTime() - new Date(tx.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }

  /**
   * Exportação de Lançamentos em CSV (com suporte Excel PT-BR)
   */
  async exportTransactionsCsv(companyId: string, res: Response) {
    const transactions = await this.prisma.transaction.findMany({
      where: { companyId, deletedAt: null },
      include: {
        category: true,
        financialAccount: true,
        customer: true,
        supplier: true,
      },
      orderBy: { competenceDate: 'desc' },
    });

    const header = [
      'Data Competência',
      'Data Vencimento',
      'Data Pagamento',
      'Tipo',
      'Descrição',
      'Categoria',
      'Conta Financeira',
      'Contato',
      'Valor (R$)',
      'Status',
    ].join(';');

    const rows = transactions.map((t) => {
      const fmtDate = (d?: Date | null) =>
        d ? d.toISOString().split('T')[0] : '';
      const contato = t.customer?.name || t.supplier?.name || '—';
      const valor = Number(t.amount).toFixed(2).replace('.', ',');

      return [
        fmtDate(t.competenceDate),
        fmtDate(t.dueDate),
        fmtDate(t.paymentDate),
        t.type === 'REVENUE' ? 'Receita' : t.type === 'EXPENSE' ? 'Despesa' : 'Transferência',
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.category?.name || '—').replace(/"/g, '""')}"`,
        `"${t.financialAccount.name.replace(/"/g, '""')}"`,
        `"${contato.replace(/"/g, '""')}"`,
        valor,
        t.status,
      ].join(';');
    });

    const bom = '\uFEFF'; // UTF-8 BOM para Excel exibir acentos perfeitamente
    const csvContent = bom + [header, ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="lancamentos-${new Date().toISOString().split('T')[0]}.csv"`,
    );

    res.send(csvContent);
  }
}
