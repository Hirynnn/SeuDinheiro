import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountingService } from './accounting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountingService (Partidas Dobradas)', () => {
  let service: AccountingService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    accountingAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    accountingEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => any) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve rejeitar lançamento contábil se houver menos de 2 linhas', async () => {
    await expect(
      service.createEntry('comp-1', {
        memo: 'Lançamento inválido',
        lines: [
          { accountingAccountId: 'acc-1', amount: 100, isCredit: false },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar lançamento contábil se o total de débitos for diferente do total de créditos', async () => {
    await expect(
      service.createEntry('comp-1', {
        memo: 'Lançamento desbalanceado',
        lines: [
          { accountingAccountId: 'acc-1', amount: 100, isCredit: false }, // Débito 100
          { accountingAccountId: 'acc-2', amount: 80, isCredit: true },   // Crédito 80
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve registrar com sucesso lançamento contábil perfeitamente balanceado', async () => {
    mockPrisma.accountingAccount.findMany.mockResolvedValue([
      { id: 'acc-1' },
      { id: 'acc-2' },
    ]);

    mockPrisma.accountingEntry.create.mockResolvedValue({
      id: 'entry-1',
      memo: 'Lançamento equilibrado',
      status: 'POSTED',
      lines: [],
    });

    const result = await service.createEntry('comp-1', {
      memo: 'Lançamento equilibrado',
      lines: [
        { accountingAccountId: 'acc-1', amount: 150.5, isCredit: false }, // Débito 150.50
        { accountingAccountId: 'acc-2', amount: 150.5, isCredit: true },  // Crédito 150.50
      ],
    });

    expect(result.balancedAmount).toBe(150.5);
    expect(mockPrisma.accountingEntry.create).toHaveBeenCalled();
  });
});
