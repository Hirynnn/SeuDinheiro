import { Routes, Route, Navigate } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterCompanyPage } from './features/auth/RegisterCompanyPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { AccountsPage } from './features/accounts/AccountsPage';
import { ReconciliationPage } from './features/reconciliation/ReconciliationPage';
import { ReportsPage } from './features/reports/ReportsPage';

export function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterCompanyPage />} />

      {/* Rotas Autenticadas com AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/cash-flow" element={<TransactionsPage />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/categories" element={<TransactionsPage />} />
        <Route path="/contacts" element={<TransactionsPage />} />
      </Route>

      {/* Rota Padrão */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
