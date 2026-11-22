# 📡 Guia da API REST — SeuDinheiro

A API do **SeuDinheiro** segue o padrão RESTful e possui documentação Swagger interativa em:
`http://localhost:3000/api/docs`

---

## Cabeçalhos Padrão

| Cabeçalho | Descrição |
|---|---|
| `Authorization` | `Bearer <access_token>` (obrigatório para rotas protegidas) |
| `x-company-id` | ID da empresa ativa para isolamento multi-tenant (opcional se contido no token) |
| `Content-Type` | `application/json` |

---

## Principais Endpoints

### 🔐 Autenticação & Empresas
- `POST /api/auth/register-company`: Cadastro completo de nova empresa e administrador.
- `POST /api/auth/login`: Autenticação por e-mail e senha com bloqueio anti-brute force.
- `POST /api/auth/refresh`: Renovação do token JWT via Refresh Token rotativo.
- `POST /api/auth/logout`: Revogação da sessão.
- `GET /api/auth/profile`: Dados do usuário e empresas vinculadas.

### 💳 Contas Financeiras & Transferências
- `GET /api/accounts`: Listagem de contas com saldo atual.
- `POST /api/accounts`: Criação de nova conta financeira.
- `POST /api/accounts/transfer`: Transferência atômica entre contas sem duplicar receitas/despesas consolidadas.
- `GET /api/accounts/:id/statement`: Extrato de movimentações da conta.

### 💰 Lançamentos Financeiros (Receitas & Despesas)
- `GET /api/transactions`: Listagem com filtros avançados (tipo, status, conta, data).
- `POST /api/transactions`: Criação de receita/despesa com opção de parcelamento.
- `POST /api/transactions/:id/settle`: Baixa de pagamento/recebimento com crédito/débito em conta.
- `DELETE /api/transactions/:id`: Cancelamento lógico com estorno de saldo.

### 📊 Dashboard & Fluxo de Caixa
- `GET /api/dashboard/overview`: Indicadores consolidado do mês, saldo total, evolução e categorias.
- `GET /api/cash-flow`: Fluxo de caixa com comparação entre valores realizados e previstos.

### 📑 Contabilidade (Partidas Dobradas)
- `GET /api/accounting/accounts`: Plano de contas com saldos contábeis calculados.
- `POST /api/accounting/entries`: Lançamento contábil com validação rigorosa ($\sum Débito = \sum Crédito$).

### 📄 Relatórios & Conciliação
- `GET /api/reports/dre`: DRE gerencial do período.
- `GET /api/reports/overdue`: Relatório de inadimplência de clientes.
- `GET /api/reports/export/csv`: Download de arquivo CSV com os lançamentos da empresa.
- `POST /api/reconciliation/import`: Upload de extrato CSV com algoritmo de auto-match.
