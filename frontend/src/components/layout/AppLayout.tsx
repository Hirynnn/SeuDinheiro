import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  FileCheck2,
  FileText,
  Tags,
  Users,
  LogOut,
  Sun,
  Moon,
  Building2,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Contas Financeiras', path: '/accounts', icon: Wallet },
  { label: 'Lançamentos', path: '/transactions', icon: ArrowUpCircle },
  { label: 'Fluxo de Caixa', path: '/cash-flow', icon: TrendingUp },
  { label: 'Conciliação', path: '/reconciliation', icon: FileCheck2 },
  { label: 'Relatórios', path: '/reports', icon: FileText },
  { label: 'Categorias', path: '/categories', icon: Tags },
  { label: 'Contatos', path: '/contacts', icon: Users },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    const rawCompany = localStorage.getItem('company');
    if (!rawUser || !rawCompany) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(rawUser));
    setCompany(JSON.parse(rawCompany));
  }, [navigate]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r bg-card flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 border-b flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h1 className="font-bold text-lg leading-tight text-primary">SeuDinheiro</h1>
              <p className="text-xs text-muted-foreground">ERP Financeiro PME</p>
            </div>
          </div>

          {/* Empresa Ativa */}
          <div className="p-4 mx-3 my-3 rounded-lg bg-muted/50 border flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <div className="truncate">
              <p className="text-xs font-semibold truncate">
                {company?.tradeName || company?.legalName || 'Minha Empresa'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                CNPJ: {company?.cnpj || '—'}
              </p>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="px-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{user?.name}</span>
            <button
              onClick={toggleDarkMode}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              title="Alternar tema"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
