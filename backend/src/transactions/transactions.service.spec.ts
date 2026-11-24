import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionsService (Lançamentos e Saldo Efetivo)', () => {
  let service: TransactionsService;

  const mockPrisma: any = {
    financialAccount: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transactionInstallment: {
      createMany: jest.fn(),
    },
    transactionHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: any) => any) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  it('não deve alterar saldo se o lançamento for criado como PENDING', async () => {
    mockPrisma.financialAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      currentBalance: '500.00',
    });

    mockPrisma.transaction.create.mockResolvedValue({
      id: 'tx-1',
      amount: '150.00',
      status: 'PENDING',
    });

    await service.create('comp-1', 'user-1', {
      type: 'EXPENSE',
      description: 'Conta de Luz',
      amount: 150,
      financialAccountId: 'acc-1',
      competenceDate: '2026-11-20',
      dueDate: '2026-11-30',
      status: 'PENDING',
    });

    expect(mockPrisma.financialAccount.update).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).toHaveBeenCalled();
  });

  it('deve debitar saldo imediatamente se a despesa for criada como PAID', async () => {
    mockPrisma.financialAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      currentBalance: '500.00',
    });

    mockPrisma.transaction.create.mockResolvedValue({
      id: 'tx-1',
      amount: '150.00',
      status: 'PAID',
    });

    await service.create('comp-1', 'user-1', {
      type: 'EXPENSE',
      description: 'Combustível',
      amount: 150,
      financialAccountId: 'acc-1',
      competenceDate: '2026-11-20',
      dueDate: '2026-11-20',
      status: 'PAID',
    });

    expect(mockPrisma.financialAccount.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { currentBalance: '350.00' },
    });
  });

  it('ao dar baixa em receita pendente, deve creditar o saldo na conta financeira', async () => {
    mockPrisma.transaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      type: 'REVENUE',
      amount: '800.00',
      status: 'PENDING',
      financialAccountId: 'acc-1',
    });

    mockPrisma.financialAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      currentBalance: '1000.00',
    });

    mockPrisma.transaction.update.mockResolvedValue({
      id: 'tx-1',
      status: 'RECEIVED',
    });

    await service.settle('comp-1', 'tx-1', 'user-1', {
      paymentDate: '2026-11-22',
    });

    expect(mockPrisma.financialAccount.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { currentBalance: '1800.00' },
    });
  });
});
