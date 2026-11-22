# 🗄️ Modelo de Dados — SeuDinheiro

## 1. Entidades Principais

### Multi-tenancy & Acesso
- **`companies`**: Armazena os dados cadastrais da empresa (CNPJ, Razão Social, Nome Fantasia, etc.).
- **`users`**: Usuários da plataforma. Um usuário pode ser membro de múltiplas empresas.
- **`company_members`**: Vínculo N:N entre usuário e empresa com papel atribuído.
- **`roles`**: Papéis na empresa (`ADMIN`, `FINANCEIRO`, `OPERADOR`, `VISUALIZADOR`).
- **`permissions`**: Permissões granulares do sistema.
- **`refresh_tokens`**: Tokens de sessão com rotação e hash criptográfico SHA-256.

### Financeiro Operacional
- **`financial_accounts`**: Contas correntes, poupanças, caixas e carteiras digitais.
- **`categories`**: Categorias de receita e despesa isoladas por empresa.
- **`customers`**: Clientes para gestão de contas a receber.
- **`suppliers`**: Fornecedores para contas a pagar.
- **`transactions`**: Lançamentos financeiros com controle de saldo efetivo.
- **`transaction_installments`**: Parcelas de transações parceladas.
- **`transaction_histories`**: Trilha de auditoria das alterações de cada lançamento.

### Contabilidade (Partidas Dobradas)
- **`accounting_accounts`**: Plano de contas hierárquico com saldo normal (Débito/Crédito).
- **`accounting_entries`**: Cabeçalho do lançamento contábil.
- **`accounting_entry_lines`**: Linhas individuais de débito e crédito.

### Conciliação & Notificações
- **`bank_statements`**: Arquivos de extrato CSV importados.
- **`bank_statement_lines`**: Linhas do extrato bancário.
- **`bank_reconciliations`**: Associação entre linha do extrato e lançamento.
- **`notifications`**: Central de alertas e vencimentos.
- **`audit_logs`**: Logs imutáveis de operações críticas.
