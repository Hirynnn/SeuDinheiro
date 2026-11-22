import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashFlowService {
  constructor(private readonly prisma: PrismaService) {}

  async getCashFlow(companyId: string, startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Buscar transações reais (efetivadas) no período
    const settledTransactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ['PAID', 'RECEIVED'] },
        paymentDate: { gte: start, lte: end },
        type: { not: 'TRANSFER' },
      },
      include: { category: true, financialAccount: true },
      orderBy: { paymentDate: 'asc' },
    });

    // Buscar transações previstas (pendentes) no período
    const projectedTransactions = await this.prisma.transaction.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { gte: start, lte: end },
        type: { not: 'TRANSFER' },
      },
      include: { category: true, financialAccount: true },
      orderBy: { dueDate: 'asc' },
    });

    let realizedInflow = new Decimal(0);
    let realizedOutflow = new Decimal(0);
    let projectedInflow = new Decimal(0);
    let projectedOutflow = new Decimal(0);

    for (const t of settledTransactions) {
      const val = new Decimal(t.amount.toString());
      if (t.type === 'REVENUE') realizedInflow = realizedInflow.plus(val);
      else realizedOutflow = realizedOutflow.plus(val);
    }

    for (const t of projectedTransactions) {
      const val = new Decimal(t.amount.toString());
      if (t.type === 'REVENUE') projectedInflow = projectedInflow.plus(val);
      else projectedOutflow = projectedOutflow.plus(val);
    }

    return {
      period: { start, end },
      realized: {
        inflows: realizedInflow.toNumber(),
        outflows: realizedOutflow.toNumber(),
        net: realizedInflow.minus(realizedOutflow).toNumber(),
        transactions: settledTransactions,
      },
      projected: {
        inflows: projectedInflow.toNumber(),
        outflows: projectedOutflow.toNumber(),
        net: projectedInflow.minus(projectedOutflow).toNumber(),
        transactions: projectedTransactions,
      },
      consolidatedNet: realizedInflow
        .minus(realizedOutflow)
        .plus(projectedInflow.minus(projectedOutflow))
        .toNumber(),
    };
  }
}
