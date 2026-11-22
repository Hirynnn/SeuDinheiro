# 🏗️ Arquitetura do Sistema — SeuDinheiro

## 1. Visão Geral

O **SeuDinheiro** é um sistema ERP financeiro SaaS comercial para pequenas e médias empresas (PMEs), projetado com foco em confiabilidade contábil, isolamento multi-tenant estrito e partidas dobradas (double-entry bookkeeping).

---

## 2. Padrões de Projeto & Camadas do Backend

Adotamos a arquitetura modular do **NestJS**:

- **Controllers**: Gerenciam o tráfego HTTP, validação de payload com DTOs e resposta com status apropriados.
- **Services**: Contêm as regras de negócio financeiras, cálculos de precisão com `Decimal.js` e coordenação de transações.
- **Guards Globais**:
  - `JwtAuthGuard`: Autentica o portador do token JWT (com suporte a `@Public()` para endpoints abertos).
  - `TenantGuard`: Intercepta o `x-company-id` ou o contexto da sessão e valida se o usuário possui vínculo ativo com o tenant solicitado.
  - `PermissionsGuard`: Validações granulares de RBAC via `@RequirePermissions()`.
- **Filtro Global de Exceção (`HttpExceptionFilter`)**: Tratamento centralizado de erros sem vazamento de dados internos ou stack traces em produção.
- **Interceptor Global (`TransformInterceptor`)**: Padronização de respostas da API com envelope `{ success: true, data: ..., timestamp: ... }`.

---

## 3. Isolamento Multi-Tenancy

Cada empresa cadastrada no sistema possui isolamento de dados:
- Todas as entidades financeiras (`FinancialAccount`, `Transaction`, `Category`, `AccountingAccount`, `AccountingEntry`, etc.) possuem a coluna obrigatória `companyId`.
- As consultas no banco de dados utilizam cláusulas `where: { companyId }`.
- O `TenantGuard` impede que usuários acessem ou manipulem dados de empresas às quais não pertencem.

---

## 4. Regras Financeiras e Contabilidade por Partidas Dobradas

1. **Precisão Numérica**:
   - Operações financeiras utilizam `Decimal(18,2)` para valores operacionais e `Decimal(18,4)` para contabilidade.
   - Ponto flutuante binário (`Float`) é estritamente proibido em cálculos monetários.

2. **Partidas Dobradas (Double-Entry Bookkeeping)**:
   - Para cada fato contábil (`AccountingEntry`), o total de débitos deve ser rigorosamente igual ao total de créditos:
     $$\sum \text{Débitos} = \sum \text{Créditos}$$
   - Lançamentos desbalanceados são rejeitados antes de qualquer persistência.

3. **Imutabilidade e Estorno**:
   - Lançamentos efetivados não são apagados diretamente do histórico contábil.
   - Cancelamentos realizam exclusão lógica (`deletedAt`) e registram estornos com ajuste transacional dos saldos.

4. **Transferências Atômicas**:
   - Uma transferência entre duas contas da mesma empresa gera dois registros correspondentes vinculados por um `transferGroupId` comum, atualizando ambos os saldos dentro de uma transação atômica (`prisma.$transaction`).
