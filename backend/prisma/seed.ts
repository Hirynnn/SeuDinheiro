import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Permissões do sistema
// ---------------------------------------------------------------------------
const PERMISSION_CODES = [
  'dashboard.view',
  'accounts.view',
  'accounts.create',
  'accounts.edit',
  'transactions.view',
  'transactions.create',
  'transactions.edit',
  'transactions.delete',
  'payables.view',
  'payables.create',
  'payables.edit',
  'receivables.view',
  'receivables.create',
  'receivables.edit',
  'categories.view',
  'categories.create',
  'categories.edit',
  'customers.view',
  'customers.create',
  'customers.edit',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'reports.view',
  'reports.export',
  'reconciliation.view',
  'reconciliation.manage',
  'users.view',
  'users.create',
  'users.edit',
  'settings.view',
  'settings.edit',
  'audit.view',
  'accounting.view',
  'accounting.create',
  'cashflow.view',
  'notifications.view',
] as const;

// Mapeamento de papéis → permissões
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ADMIN: PERMISSION_CODES,
  FINANCEIRO: PERMISSION_CODES.filter(
    (code) => !code.startsWith('users.') && !code.startsWith('settings.'),
  ),
  OPERADOR: PERMISSION_CODES.filter(
    (code) =>
      code.endsWith('.view') ||
      code.endsWith('.create') ||
      code === 'notifications.view',
  ),
  VISUALIZADOR: PERMISSION_CODES.filter((code) => code.endsWith('.view')),
};

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ---- Permissões ----
  const permissions = await Promise.all(
    PERMISSION_CODES.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          description: code
            .replace('.', ': ')
            .replace(/^\w/, (c) => c.toUpperCase()),
        },
      }),
    ),
  );
  const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));
  console.log(`✅ ${permissions.length} permissões criadas.`);

  // ---- Empresa demo ----
  const company = await prisma.company.upsert({
    where: { cnpj: '12345678000100' },
    update: {},
    create: {
      legalName: 'Empresa Demonstração Ltda',
      tradeName: 'Demo Corp',
      cnpj: '12345678000100',
      email: 'contato@demo.com',
      phone: '(11) 99999-9999',
      address: 'Rua Exemplo, 123 - São Paulo/SP',
      defaultCurrency: 'BRL',
    },
  });
  console.log(`✅ Empresa: ${company.tradeName} (${company.cnpj})`);

  // ---- Papéis com permissões ----
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleName } },
      update: {},
      create: { companyId: company.id, name: roleName, isSystem: true },
    });
    const rolePermData = codes
      .map((code) => permissionMap.get(code))
      .filter((id): id is string => !!id)
      .map((permissionId) => ({ roleId: role.id, permissionId }));
    await prisma.rolePermission.createMany({
      data: rolePermData,
      skipDuplicates: true,
    });
    console.log(`   📋 Papel ${roleName}: ${rolePermData.length} permissões`);
  }

  // ---- Usuário admin demo ----
  const passwordHash = await argon2.hash('senha123');
  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Administrador Demo',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  const adminRole = await prisma.role.findUnique({
    where: { companyId_name: { companyId: company.id, name: 'ADMIN' } },
  });
  if (adminRole) {
    await prisma.companyMember.upsert({
      where: {
        userId_companyId: { userId: user.id, companyId: company.id },
      },
      update: {},
      create: {
        userId: user.id,
        companyId: company.id,
        roleId: adminRole.id,
      },
    });
  }
  console.log(`✅ Usuário: ${user.email} / senha123`);

  // ---- Categorias padrão ----
  const categories = [
    { name: 'Alimentação', type: 'EXPENSE' as const },
    { name: 'Transporte', type: 'EXPENSE' as const },
    { name: 'Aluguel', type: 'EXPENSE' as const },
    { name: 'Salários', type: 'EXPENSE' as const },
    { name: 'Fornecedores', type: 'EXPENSE' as const },
    { name: 'Impostos', type: 'EXPENSE' as const },
    { name: 'Marketing', type: 'EXPENSE' as const },
    { name: 'Tecnologia', type: 'EXPENSE' as const },
    { name: 'Outras Despesas', type: 'EXPENSE' as const },
    { name: 'Vendas', type: 'REVENUE' as const },
    { name: 'Serviços', type: 'REVENUE' as const },
    { name: 'Investimentos', type: 'REVENUE' as const },
    { name: 'Outras Receitas', type: 'REVENUE' as const },
  ];
  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        companyId_name_type: {
          companyId: company.id,
          name: cat.name,
          type: cat.type,
        },
      },
      update: {},
      create: { companyId: company.id, ...cat },
    });
  }
  console.log(`✅ ${categories.length} categorias padrão criadas.`);

  // ---- Contas financeiras demo ----
  const accounts = [
    { name: 'Conta Corrente Bradesco', type: 'CHECKING' as const, initialBalance: 15000 },
    { name: 'Poupança Nubank', type: 'SAVINGS' as const, initialBalance: 8500 },
    { name: 'Caixa da Loja', type: 'CASH' as const, initialBalance: 2000 },
    { name: 'PagSeguro', type: 'WALLET' as const, initialBalance: 3200 },
  ];
  for (const acc of accounts) {
    await prisma.financialAccount.create({
      data: {
        companyId: company.id,
        name: acc.name,
        type: acc.type,
        initialBalance: acc.initialBalance,
        currentBalance: acc.initialBalance,
      },
    });
  }
  console.log(`✅ ${accounts.length} contas financeiras criadas.`);

  // ---- Plano de contas contábil ----
  const chartOfAccounts = [
    { code: '1', name: 'Ativo', type: 'ASSET' as const, normalBalance: 'DEBIT' as const },
    { code: '1.1', name: 'Ativo Circulante', type: 'ASSET' as const, normalBalance: 'DEBIT' as const, parentCode: '1' },
    { code: '1.1.01', name: 'Caixa e Equivalentes', type: 'ASSET' as const, normalBalance: 'DEBIT' as const, parentCode: '1.1' },
    { code: '1.1.02', name: 'Contas a Receber', type: 'ASSET' as const, normalBalance: 'DEBIT' as const, parentCode: '1.1' },
    { code: '2', name: 'Passivo', type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const },
    { code: '2.1', name: 'Passivo Circulante', type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, parentCode: '2' },
    { code: '2.1.01', name: 'Contas a Pagar', type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, parentCode: '2.1' },
    { code: '3', name: 'Patrimônio Líquido', type: 'EQUITY' as const, normalBalance: 'CREDIT' as const },
    { code: '3.1', name: 'Capital Social', type: 'EQUITY' as const, normalBalance: 'CREDIT' as const, parentCode: '3' },
    { code: '4', name: 'Receitas', type: 'REVENUE' as const, normalBalance: 'CREDIT' as const },
    { code: '4.1', name: 'Receita de Vendas', type: 'REVENUE' as const, normalBalance: 'CREDIT' as const, parentCode: '4' },
    { code: '4.2', name: 'Receita de Serviços', type: 'REVENUE' as const, normalBalance: 'CREDIT' as const, parentCode: '4' },
    { code: '5', name: 'Despesas', type: 'EXPENSE' as const, normalBalance: 'DEBIT' as const },
    { code: '5.1', name: 'Despesas Operacionais', type: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, parentCode: '5' },
    { code: '5.2', name: 'Despesas Administrativas', type: 'EXPENSE' as const, normalBalance: 'DEBIT' as const, parentCode: '5' },
  ];

  const accountIdByCode = new Map<string, string>();
  for (const acc of chartOfAccounts) {
    const parentId = acc.parentCode
      ? accountIdByCode.get(acc.parentCode) ?? null
      : null;
    const created = await prisma.accountingAccount.upsert({
      where: {
        companyId_code: { companyId: company.id, code: acc.code },
      },
      update: {},
      create: {
        companyId: company.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        parentId,
      },
    });
    accountIdByCode.set(acc.code, created.id);
  }
  console.log(`✅ ${chartOfAccounts.length} contas contábeis criadas.\n`);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('📧 Login demo: admin@demo.com / senha123');
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
