import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { api } from '../../api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('senha123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post<any>('/auth/login', { email, password });
      const { accessToken, refreshToken, user, activeCompany } = response.data;

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      if (activeCompany) {
        localStorage.setItem('company', JSON.stringify(activeCompany));
        localStorage.setItem('companyId', activeCompany.id);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl mb-2">💰</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            SeuDinheiro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entre na sua conta para gerenciar seu negócio
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Senha</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Acessar Plataforma'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link
            to="/register"
            className="font-medium text-primary underline hover:text-primary/80"
          >
            Cadastrar minha empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
