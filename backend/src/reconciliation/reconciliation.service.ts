import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportStatementDto {
  financialAccountId: string;
  fileName: string;
  csvContent: string;
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Importação e processamento de extrato bancário CSV com Auto-Match inteligente
   */
  async importStatement(
    companyId: string,
    userId: string,
    dto: ImportStatementDto,
  ) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: dto.financialAccountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Conta financeira não encontrada.');
    }

    const lines = dto.csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('O arquivo CSV deve conter um cabeçalho e ao menos uma linha de lançamento.');
    }

    // Parsing das linhas: espera colunas como Data, Descrição, Valor (ou formato padrão bancário)
    const statementLinesData: {
      date: Date;
      description: string;
      amount: Decimal;
      lineNumber: number;
    }[] = [];

    // Ignora a primeira linha (cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Suporta separador vírgula ou ponto-e-vírgula
      const cols = line.split(/[;,]/).map((c) => c.replace(/^["']|["']$/g, '').trim());

      if (cols.length < 3) continue;

      const dateStr = cols[0];
      const desc = cols[1];
      const valStr = cols[2].replace(/\./g, '').replace(',', '.'); // Converte formato pt-BR

      const parsedDate = new Date(dateStr);
      const parsedVal = new Decimal(isNaN(Number(valStr)) ? 0 : valStr);

      if (!isNaN(parsedDate.getTime()) && !parsedVal.isZero()) {
        statementLinesData.push({
          date: parsedDate,
          description: desc,
          amount: parsedVal,
          lineNumber: i,
        });
      }
    }

    if (statementLinesData.length === 0) {
      throw new BadRequestException('Nenhum lançamento válido foi extraído do arquivo CSV.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Criar cabeçalho do extrato
      const statement = await tx.bankStatement.create({
        data: {
          companyId,
          financialAccountId: account.id,
          fileName: dto.fileName,
          importedById: userId,
        },
      });

      // 2. Criar linhas do extrato
      let autoMatchedCount = 0;

      for (const item of statementLinesData) {
        const stmtLine = await tx.bankStatementLine.create({
          data: {
            statementId: statement.id,
            date: item.date,
            description: item.description,
            amount: item.amount.toFixed(2),
            lineNumber: item.lineNumber,
          },
        });

        // 3. Algoritmo de Auto-Match: busca lançamento existente com mesmo valor (ou oposto se despesa)
        const matchCandidate = await tx.transaction.findFirst({
          where: {
            companyId,
            financialAccountId: account.id,
            deletedAt: null,
            amount: item.amount.abs().toFixed(2),
            status: { in: ['PAID', 'RECEIVED'] },
            reconciliations: { none: {} }, // Que ainda não foi conciliado
          },
        });

        if (matchCandidate) {
          await tx.bankReconciliation.create({
            data: {
              companyId,
              statementLineId: stmtLine.id,
              transactionId: matchCandidate.id,
              status: 'MATCHED',
              reconciledById: userId,
              reconciledAt: new Date(),
              notes: 'Conciliação automática por correspondência exata de valor e conta.',
            },
          });
          autoMatchedCount++;
        } else {
          await tx.bankReconciliation.create({
            data: {
              companyId,
              statementLineId: stmtLine.id,
              status: 'UNMATCHED',
            },
          });
        }
      }

      return {
        message: 'Extrato importado com sucesso.',
        statementId: statement.id,
        totalLines: statementLinesData.length,
        autoMatchedCount,
      };
    });
  }

  async listStatements(companyId: string) {
    return this.prisma.bankStatement.findMany({
      where: { companyId },
      include: {
        financialAccount: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { importedAt: 'desc' },
    });
  }

  async getStatementDetails(companyId: string, statementId: string) {
    const statement = await this.prisma.bankStatement.findFirst({
      where: { id: statementId, companyId },
      include: {
        financialAccount: true,
        lines: {
          include: {
            reconciliation: {
              include: {
                transaction: {
                  include: { category: true },
                },
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!statement) {
      throw new NotFoundException('Extrato bancário não encontrado.');
    }

    return statement;
  }

  async manualMatch(
    companyId: string,
    statementLineId: string,
    transactionId: string,
    userId: string,
  ) {
    const line = await this.prisma.bankStatementLine.findFirst({
      where: { id: statementLineId, statement: { companyId } },
    });

    if (!line) {
      throw new NotFoundException('Linha do extrato não encontrada.');
    }

    const tx = await this.prisma.transaction.findFirst({
      where: { id: transactionId, companyId, deletedAt: null },
    });

    if (!tx) {
      throw new NotFoundException('Lançamento financeiro não encontrado.');
    }

    return this.prisma.bankReconciliation.upsert({
      where: { statementLineId },
      update: {
        transactionId: tx.id,
        status: 'MATCHED',
        reconciledById: userId,
        reconciledAt: new Date(),
        notes: 'Conciliação manual efetuada pelo operador.',
      },
      create: {
        companyId,
        statementLineId,
        transactionId: tx.id,
        status: 'MATCHED',
        reconciledById: userId,
        reconciledAt: new Date(),
        notes: 'Conciliação manual efetuada pelo operador.',
      },
    });
  }
}
