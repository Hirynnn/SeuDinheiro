import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, SettleTransactionDto } from './dto/transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criação de lançamento com regras transacionais de saldo e histórico
   */
  async create(companyId: string, userId: string, dto: CreateTransactionDto) {
    const rawAmount = new Decimal(dto.amount);
    const status = dto.status || 'PENDING';
    const isSettled = status === 'PAID' || status === 'RECEIVED';

    return this.prisma.$transaction(async (tx) => {
      // 1. Validar se a conta financeira pertence à empresa e não está arquivada
      const account = await tx.financialAccount.findFirst({
        where: { id: dto.financialAccountId, companyId, isArchived: false },
      });
      if (!account) {
        throw new NotFoundException('Conta financeira não encontrada ou arquivada.');
      }

      // 2. Se for liquidada na criação, atualizar saldo da conta
      if (isSettled) {
        const delta = dto.type === 'REVENUE' ? rawAmount : rawAmount.negated();
        const currentBalance = new Decimal(account.currentBalance.toString());
        const newBalance = currentBalance.plus(delta);

        await tx.financialAccount.update({
          where: { id: account.id },
          data: { currentBalance: newBalance.toFixed(2) },
        });
      }

      // 3. Criar o lançamento
      const transaction = await tx.transaction.create({
        data: {
          companyId,
          createdById: userId,
          type: dto.type,
          description: dto.description,
          amount: rawAmount.toFixed(2),
          financialAccountId: account.id,
          categoryId: dto.categoryId,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          competenceDate: new Date(dto.competenceDate),
          dueDate: new Date(dto.dueDate),
          paymentDate: isSettled
            ? dto.paymentDate ? new Date(dto.paymentDate) : new Date()
            : null,
          status,
          notes: dto.notes,
        },
      });

      // 4. Se houver parcelamento especificado
      if (dto.installments && dto.installments.length > 0) {
        await tx.transactionInstallment.createMany({
          data: dto.installments.map((inst) => ({
            transactionId: transaction.id,
            installmentNumber: inst.installmentNumber,
            amount: new Decimal(inst.amount).toFixed(2),
            dueDate: new Date(inst.dueDate),
            status: 'PENDING',
          })),
        });
      }

      // 5. Registrar histórico de auditoria do lançamento
      await tx.transactionHistory.create({
        data: {
          transactionId: transaction.id,
          changedById: userId,
          field: 'STATUS',
          oldValue: null,
          newValue: status,
        },
      });

      return transaction;
    });
  }

  /**
   * Listagem com filtros avançados, paginação e ordenação
   */
  async list(companyId: string, query: QueryTransactionDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      companyId,
      deletedAt: null,
      type: { not: 'TRANSFER' }, // Transferências têm visualização própria no extrato
    };

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.financialAccountId) where.financialAccountId = query.financialAccountId;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.search) {
      where.description = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.startDate || query.endDate) {
      where.competenceDate = {};
      if (query.startDate) where.competenceDate.gte = new Date(query.startDate);
      if (query.endDate) where.competenceDate.lte = new Date(query.endDate);
    }

    if (query.dueStartDate || query.dueEndDate) {
      where.dueDate = {};
      if (query.dueStartDate) where.dueDate.gte = new Date(query.dueStartDate);
      if (query.dueEndDate) where.dueDate.lte = new Date(query.dueEndDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, type: true } },
          financialAccount: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          installments: true,
        },
        orderBy: { competenceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Detalhes de um lançamento com histórico e parcelas
   */
  async findOne(companyId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        category: true,
        financialAccount: true,
        customer: true,
        supplier: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        history: {
          include: {
            changedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { changedAt: 'desc' },
        },
        attachments: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    return transaction;
  }

  /**
   * Baixa de pagamento ou recebimento (efetivação)
   */
  async settle(
    companyId: string,
    id: string,
    userId: string,
    dto: SettleTransactionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, companyId, deletedAt: null },
      });

      if (!transaction) {
        throw new NotFoundException('Lançamento não encontrado.');
      }

      if (transaction.status === 'PAID' || transaction.status === 'RECEIVED') {
        throw new BadRequestException('Este lançamento já foi liquidado.');
      }

      const accountId = dto.financialAccountId || transaction.financialAccountId;
      const account = await tx.financialAccount.findFirst({
        where: { id: accountId, companyId, isArchived: false },
      });
      if (!account) {
        throw new NotFoundException('Conta financeira para liquidação não encontrada.');
      }

      const settleStatus: TransactionStatus =
        transaction.type === 'REVENUE' ? 'RECEIVED' : 'PAID';

      const amountToSettle = dto.settledAmount
        ? new Decimal(dto.settledAmount)
        : new Decimal(transaction.amount.toString());

      // Atualiza o saldo da conta financeira
      const delta =
        transaction.type === 'REVENUE'
          ? amountToSettle
          : amountToSettle.negated();

      const currentBalance = new Decimal(account.currentBalance.toString());
      const newBalance = currentBalance.plus(delta);

      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance.toFixed(2) },
      });

      // Atualiza o lançamento
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: settleStatus,
          paymentDate: new Date(dto.paymentDate),
          financialAccountId: account.id,
        },
      });

      // Grava no histórico imutável
      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          changedById: userId,
          field: 'STATUS',
          oldValue: transaction.status,
          newValue: settleStatus,
        },
      });

      return updated;
    });
  }

  /**
   * Exclusão lógica com estorno de saldo se o lançamento já estava pago/recebido
   */
  async remove(companyId: string, id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, companyId, deletedAt: null },
      });

      if (!transaction) {
        throw new NotFoundException('Lançamento não encontrado.');
      }

      // Se estava efetivado, estorna o impacto no saldo
      if (transaction.status === 'PAID' || transaction.status === 'RECEIVED') {
        const account = await tx.financialAccount.findUnique({
          where: { id: transaction.financialAccountId },
        });

        if (account) {
          const amount = new Decimal(transaction.amount.toString());
          // Estorno: se era receita (entrada), subtrai; se era despesa (saída), soma de volta
          const reverseDelta =
            transaction.type === 'REVENUE' ? amount.negated() : amount;

          const currentBalance = new Decimal(account.currentBalance.toString());
          const revertedBalance = currentBalance.plus(reverseDelta);

          await tx.financialAccount.update({
            where: { id: account.id },
            data: { currentBalance: revertedBalance.toFixed(2) },
          });
        }
      }

      // Exclusão lógica
      await tx.transaction.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'CANCELLED',
        },
      });

      await tx.transactionHistory.create({
        data: {
          transactionId: id,
          changedById: userId,
          field: 'DELETED',
          oldValue: transaction.status,
          newValue: 'CANCELLED',
        },
      });

      return { message: 'Lançamento cancelado e saldo revertido com sucesso.' };
    });
  }
}
