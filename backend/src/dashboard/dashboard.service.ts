import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(companyId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Saldo consolidado das contas financeiras ativas
    const accounts = await this.prisma.financialAccount.findMany({
      where: { companyId, isArchived: false },
      select: { currentBalance: true, name: true, type: true },
    });

    const totalBalance = accounts.reduce(
      (acc, curr) => acc.plus(new Decimal(curr.currentBalance.toString())),
      new Decimal(0),
    );

    // 2. Receitas e Despesas efetivadas do mês atual
    const monthlyTransactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: { in: ['REVENUE', 'EXPENSE'] },
        status: { in: ['PAID', 'RECEIVED'] },
        competenceDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        type: true,
        amount: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    });

    let monthlyRevenue = new Decimal(0);
    let monthlyExpense = new Decimal(0);
    const expensesByCategoryMap = new Map<string, Decimal>();
    const revenuesByCategoryMap = new Map<string, Decimal>();

    for (const tx of monthlyTransactions) {
      const val = new Decimal(tx.amount.toString());
      const catName = tx.category?.name || 'Sem categoria';

      if (tx.type === 'REVENUE') {
        monthlyRevenue = monthlyRevenue.plus(val);
        const current = revenuesByCategoryMap.get(catName) || new Decimal(0);
        revenuesByCategoryMap.set(catName, current.plus(val));
      } else {
        monthlyExpense = monthlyExpense.plus(val);
        const current = expensesByCategoryMap.get(catName) || new Decimal(0);
        expensesByCategoryMap.set(catName, current.plus(val));
      }
    }

    const netResult = monthlyRevenue.minus(monthlyExpense);

    // 3. Contas a pagar pendentes e vencidas
    const pendingPayables = await this.prisma.transaction.findMany({
      where: {
        companyId,
        type: 'EXPENSE',
        deletedAt: null,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      select: { amount: true, dueDate: true },
    });

    let totalPayables = new Decimal(0);
    let overduePayables = new Decimal(0);

    for (const p of pendingPayables) {
      const amt = new Decimal(p.amount.toString());
      totalPayables = totalPayables.plus(amt);
      if (new Date(p.dueDate) < now) {
        overduePayables = overduePayables.plus(amt);
      }
    }

    // 4. Contas a receber pendentes e vencidas
    const pendingReceivables = await this.prisma.transaction.findMany({
      where: {
        companyId,
        type: 'REVENUE',
        deletedAt: null,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      select: { amount: true, dueDate: true },
    });

    let totalReceivables = new Decimal(0);
    let overdueReceivables = new Decimal(0);

    for (const r of pendingReceivables) {
      const amt = new Decimal(r.amount.toString());
      totalReceivables = totalReceivables.plus(amt);
      if (new Date(r.dueDate) < now) {
        overdueReceivables = overdueReceivables.plus(amt);
      }
    }

    // 5. Lançamentos recentes (últimos 10)
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { companyId, deletedAt: null },
      include: {
        category: { select: { name: true, type: true } },
        financialAccount: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 6. Evolução mensal dos últimos 6 meses
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const historyTransactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: { in: ['REVENUE', 'EXPENSE'] },
        status: { in: ['PAID', 'RECEIVED'] },
        competenceDate: { gte: sixMonthsAgo },
      },
      select: { type: true, amount: true, competenceDate: true },
    });

    const monthlyEvolution: {
      month: string;
      revenue: number;
      expense: number;
      result: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      const mMonth = d.getMonth();
      const mYear = d.getFullYear();

      let mRev = new Decimal(0);
      let mExp = new Decimal(0);

      for (const t of historyTransactions) {
        const tDate = new Date(t.competenceDate);
        if (tDate.getMonth() === mMonth && tDate.getFullYear() === mYear) {
          const amt = new Decimal(t.amount.toString());
          if (t.type === 'REVENUE') mRev = mRev.plus(amt);
          else mExp = mExp.plus(amt);
        }
      }

      monthlyEvolution.push({
        month: mLabel,
        revenue: mRev.toNumber(),
        expense: mExp.toNumber(),
        result: mRev.minus(mExp).toNumber(),
      });
    }

    return {
      summary: {
        totalBalance: totalBalance.toNumber(),
        monthlyRevenue: monthlyRevenue.toNumber(),
        monthlyExpense: monthlyExpense.toNumber(),
        netResult: netResult.toNumber(),
        payables: {
          total: totalPayables.toNumber(),
          overdue: overduePayables.toNumber(),
        },
        receivables: {
          total: totalReceivables.toNumber(),
          overdue: overdueReceivables.toNumber(),
        },
      },
      charts: {
        expensesByCategory: Array.from(expensesByCategoryMap.entries()).map(
          ([category, value]) => ({ category, value: value.toNumber() }),
        ),
        revenuesByCategory: Array.from(revenuesByCategoryMap.entries()).map(
          ([category, value]) => ({ category, value: value.toNumber() }),
        ),
        monthlyEvolution,
      },
      recentTransactions,
    };
  }
}
