import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FinancialAccountsService } from './financial-accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FinancialAccountsService (Transferências)', () => {
  let service: FinancialAccountsService;

  const mockPrisma = {
    financialAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAccountsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FinancialAccountsService>(FinancialAccountsService);
    jest.clearAllMocks();
  });

  it('não deve permitir transferência para a mesma conta de origem', async () => {
    await expect(
      service.transfer('comp-1', 'user-1', {
        sourceAccountId: 'acc-1',
        destinationAccountId: 'acc-1',
        amount: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('não deve permitir transferência com valor zerado ou negativo', async () => {
    await expect(
      service.transfer('comp-1', 'user-1', {
        sourceAccountId: 'acc-1',
        destinationAccountId: 'acc-2',
        amount: -50,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve realizar transferência atômica debitando da origem e creditando no destino', async () => {
    mockPrisma.financialAccount.findFirst
      .mockResolvedValueOnce({
        id: 'acc-1',
        name: 'Conta Corrente',
        currentBalance: '1000.00',
      })
      .mockResolvedValueOnce({
        id: 'acc-2',
        name: 'Poupança',
        currentBalance: '200.00',
      });

    mockPrisma.transaction.create
      .mockResolvedValueOnce({ id: 'tx-1', amount: '-300.00' })
      .mockResolvedValueOnce({ id: 'tx-2', amount: '300.00' });

    const result = await service.transfer('comp-1', 'user-1', {
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: 300,
      notes: 'Reserva de emergência',
    });

    expect(result.sourceNewBalance).toBe(700);
    expect(result.destinationNewBalance).toBe(500);
    expect(mockPrisma.financialAccount.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2);
  });
});
