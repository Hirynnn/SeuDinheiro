import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountingAccountDto,
  CreateAccountingEntryDto,
} from './dto/accounting.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Plano de Contas ----
  async createAccount(companyId: string, dto: CreateAccountingAccountDto) {
    const existing = await this.prisma.accountingAccount.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Já existe uma conta contábil com o código '${dto.code}'.`,
      );
    }

    return this.prisma.accountingAccount.create({
      data: {
        companyId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        normalBalance: dto.normalBalance,
        parentId: dto.parentId,
      },
    });
  }

  async listAccounts(companyId: string) {
    const accounts = await this.prisma.accountingAccount.findMany({
      where: { companyId, isActive: true },
      include: {
        lines: {
          select: {
            amount: true,
            isCredit: true,
            entry: { select: { status: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Calcular o saldo contábil atual de cada conta de acordo com o saldo normal
    return accounts.map((acc) => {
      let balance = new Decimal(0);

      for (const line of acc.lines) {
        if (line.entry.status !== 'POSTED') continue;
        const lineAmount = new Decimal(line.amount.toString());

        if (acc.normalBalance === 'DEBIT') {
          balance = line.isCredit
            ? balance.minus(lineAmount)
            : balance.plus(lineAmount);
        } else {
          balance = line.isCredit
            ? balance.plus(lineAmount)
            : balance.minus(lineAmount);
        }
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        parentId: acc.parentId,
        balance: balance.toNumber(),
      };
    });
  }

  // ---- Lançamentos Contábeis (Partidas Dobradas) ----
  async createEntry(companyId: string, dto: CreateAccountingEntryDto) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException(
        'Um lançamento contábil exige no mínimo duas linhas (ao menos 1 débito e 1 crédito).',
      );
    }

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    for (const line of dto.lines) {
      const amt = new Decimal(line.amount);
      if (amt.isNegative() || amt.isZero()) {
        throw new BadRequestException('O valor de cada linha contábil deve ser positivo.');
      }
      if (line.isCredit) {
        totalCredits = totalCredits.plus(amt);
      } else {
        totalDebits = totalDebits.plus(amt);
      }
    }

    // Regra fundamental: Soma dos Débitos == Soma dos Créditos
    const diff = totalDebits.minus(totalCredits).abs();
    if (diff.greaterThan(new Decimal('0.0001'))) {
      throw new BadRequestException(
        `Lançamento contábil desbalanceado: Total de Débitos (${totalDebits.toFixed(2)}) difere do Total de Créditos (${totalCredits.toFixed(2)}).`,
      );
    }

    // Validação de que todas as contas pertencem à empresa
    const accountIds = [...new Set(dto.lines.map((l) => l.accountingAccountId))];
    const existingAccounts = await this.prisma.accountingAccount.findMany({
      where: { id: { in: accountIds }, companyId, isActive: true },
    });

    if (existingAccounts.length !== accountIds.length) {
      throw new BadRequestException('Uma ou mais contas contábeis informadas são inválidas.');
    }

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.accountingEntry.create({
        data: {
          companyId,
          memo: dto.memo,
          reference: dto.reference,
          transactionId: dto.transactionId,
          status: 'POSTED',
          lines: {
            create: dto.lines.map((line) => ({
              accountingAccountId: line.accountingAccountId,
              amount: new Decimal(line.amount).toFixed(4),
              isCredit: line.isCredit,
            })),
          },
        },
        include: {
          lines: {
            include: { account: { select: { code: true, name: true } } },
          },
        },
      });

      return {
        message: 'Lançamento contábil registrado com sucesso.',
        entry,
        balancedAmount: totalDebits.toNumber(),
      };
    });
  }

  async listEntries(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { companyId };
    if (startDate || endDate) {
      where.postedAt = {};
      if (startDate) where.postedAt.gte = new Date(startDate);
      if (endDate) where.postedAt.lte = new Date(endDate);
    }

    return this.prisma.accountingEntry.findMany({
      where,
      include: {
        lines: {
          include: { account: { select: { code: true, name: true, type: true } } },
        },
      },
      orderBy: { postedAt: 'desc' },
      take: 50,
    });
  }
}
