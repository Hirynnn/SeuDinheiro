import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { api } from '../../api/client';

export function RegisterCompanyPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    cnpj: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post<any>('/auth/register-company', formData);
      const { accessToken, refreshToken, user, company } = response.data;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('company', JSON.stringify(company));
      localStorage.setItem('companyId', company.id);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">🏢</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cadastrar Nova Empresa
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie sua conta SaaS multi-tenant no SeuDinheiro
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Razão Social</label>
              <input
                type="text"
                required
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Exemplo Ltda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Exemplo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CNPJ</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <hr className="my-2 border-border" />

          <div>
            <label className="block text-sm font-medium mb-1">Nome do Administrador</label>
            <input
              type="text"
              required
              value={formData.adminName}
              onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Seu Nome Completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-mail de Acesso</label>
            <input
              type="email"
              required
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="admin@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Senha (mínimo 8 caracteres)</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.adminPassword}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Já possui conta?{' '}
          <Link
            to="/login"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
