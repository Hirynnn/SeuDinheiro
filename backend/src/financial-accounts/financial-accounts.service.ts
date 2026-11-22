import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  TransferBetweenAccountsDto,
  UpdateAccountDto,
} from './dto/account.dto';

@Injectable()
export class FinancialAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateAccountDto) {
    const initial = new Decimal(dto.initialBalance || 0);

    return this.prisma.financialAccount.create({
      data: {
        companyId,
        name: dto.name,
        type: dto.type,
        initialBalance: initial.toFixed(2),
        currentBalance: initial.toFixed(2),
        currency: dto.currency || 'BRL',
      },
    });
  }

  async list(companyId: string, includeArchived = false) {
    return this.prisma.financialAccount.findMany({
      where: {
        companyId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException('Conta financeira não encontrada.');
    }

    return account;
  }

  async update(companyId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(companyId, id);

    return this.prisma.financialAccount.update({
      where: { id },
      data: dto,
    });
  }

  async getStatement(companyId: string, id: string, startDate?: string, endDate?: string) {
    await this.findOne(companyId, id);

    const where: Prisma.TransactionWhereInput = {
      companyId,
      financialAccountId: id,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.competenceDate = {};
      if (startDate) where.competenceDate.gte = new Date(startDate);
      if (endDate) where.competenceDate.lte = new Date(endDate);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
        customer: true,
        supplier: true,
        destinationAccount: true,
      },
      orderBy: { competenceDate: 'desc' },
    });

    return transactions;
  }

  /**
   * Transferência Atômica entre contas sem duplicar receita/despesa consolidada
   */
  async transfer(companyId: string, userId: string, dto: TransferBetweenAccountsDto) {
    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException('A conta de origem e destino devem ser diferentes.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('O valor da transferência deve ser positivo.');
    }

    const transferAmount = new Decimal(dto.amount);
    const transferDate = dto.date ? new Date(dto.date) : new Date();
    const transferGroupId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      // 1. Obter e bloquear contas para atualização consistente
      const source = await tx.financialAccount.findFirst({
        where: { id: dto.sourceAccountId, companyId, isArchived: false },
      });
      const destination = await tx.financialAccount.findFirst({
        where: { id: dto.destinationAccountId, companyId, isArchived: false },
      });

      if (!source || !destination) {
        throw new NotFoundException('Conta de origem ou destino não encontrada.');
      }

      const sourceBalance = new Decimal(source.currentBalance.toString());
      const destinationBalance = new Decimal(destination.currentBalance.toString());

      // 2. Atualizar saldos atômicos
      const newSourceBalance = sourceBalance.minus(transferAmount);
      const newDestBalance = destinationBalance.plus(transferAmount);

      await tx.financialAccount.update({
        where: { id: source.id },
        data: { currentBalance: newSourceBalance.toFixed(2) },
      });

      await tx.financialAccount.update({
        where: { id: destination.id },
        data: { currentBalance: newDestBalance.toFixed(2) },
      });

      // 3. Registrar Transação de Saída (origem)
      const outgoing = await tx.transaction.create({
        data: {
          companyId,
          createdById: userId,
          type: 'TRANSFER',
          description: `Transferência para ${destination.name}`,
          amount: transferAmount.negated().toFixed(2), // Negativo para saída
          financialAccountId: source.id,
          destinationAccountId: destination.id,
          transferGroupId,
          competenceDate: transferDate,
          dueDate: transferDate,
          paymentDate: transferDate,
          status: 'PAID',
          notes: dto.notes,
        },
      });

      // 4. Registrar Transação de Entrada (destino)
      const incoming = await tx.transaction.create({
        data: {
          companyId,
          createdById: userId,
          type: 'TRANSFER',
          description: `Transferência de ${source.name}`,
          amount: transferAmount.toFixed(2), // Positivo para entrada
          financialAccountId: destination.id,
          destinationAccountId: source.id,
          transferGroupId,
          competenceDate: transferDate,
          dueDate: transferDate,
          paymentDate: transferDate,
          status: 'RECEIVED',
          notes: dto.notes,
        },
      });

      return {
        message: 'Transferência concluída com sucesso.',
        transferGroupId,
        outgoing,
        incoming,
        sourceNewBalance: newSourceBalance.toNumber(),
        destinationNewBalance: newDestBalance.toNumber(),
      };
    });
  }
}
