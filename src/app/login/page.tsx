'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Envelope, Lock, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Se já estiver logado, redireciona automaticamente para o dashboard apropriado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        redirectUser(session.user.id);
      }
    };
    checkUser();
  }, []);

  const redirectUser = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('shift_profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/broker');
        }
      } else {
        // Tenta de novo após 1 segundo caso o trigger da database ainda esteja processando
        setTimeout(async () => {
          const { data: retryProfile } = await supabase
            .from('shift_profiles')
            .select('role')
            .eq('id', userId)
            .single();
          if (retryProfile?.role === 'admin') {
            router.push('/dashboard/admin');
          } else {
            router.push('/dashboard/broker');
          }
        }, 1200);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro ao identificar tipo de conta.');
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos.' 
          : error.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        await redirectUser(data.session.user.id);
      }
    } catch (err: any) {
      setErrorMsg('Ocorreu um erro ao tentar fazer login.');
      setLoading(false);
    }
  };

  return (
    <main className="relative min-height-100vh flex items-center justify-center overflow-hidden bg-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Grid Lines no Background */}
      <div className="mgrid"></div>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(71, 241, 228, 0.05) 0%, transparent 80%)' }}></div>

      <div className="relative z-10 w-full max-w-md p-8 mx-4 rounded-lg bg-surface border border-[rgba(71,241,228,0.1)] shadow-2xl backdrop-blur-xl" style={{ border: '1px solid rgba(71,241,228,0.1)', background: 'rgba(27,27,32,0.65)' }}>
        
        {/* Header do Login */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Shift Creativ3" className="h-10 mx-auto mb-4 object-contain" style={{ height: '40px', margin: '0 auto 16px auto' }} />
          <h2 className="text-2xl font-black text-text tracking-tight uppercase" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '1px' }}>
            Portal de Clientes
          </h2>
          <p className="text-xs text-muted mt-2" style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
            Entra para selecionar e transferir as tuas mídias
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-red-950/30 border border-red-500/20 text-red-400 text-xs text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fc8181', fontSize: '0.75rem', padding: '12px', borderRadius: '4px', marginBottom: '24px' }}>
            {errorMsg}
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block" style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
              Endereço de E-mail
            </label>
            <div className="relative" style={{ position: 'relative' }}>
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                <Envelope size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@empresa.com"
                className="w-full pl-10 pr-4 py-3 bg-surface-low border border-[rgba(71,241,228,0.1)] rounded focus:outline-none focus:border-teal-dark text-text text-sm transition-all"
                style={{ width: '100%', padding: '12px 16px 12px 40px', background: 'var(--color-surface-low)', border: '1px solid rgba(71,241,228,0.15)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block" style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>
              Palavra-passe
            </label>
            <div className="relative" style={{ position: 'relative' }}>
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-surface-low border border-[rgba(71,241,228,0.1)] rounded focus:outline-none focus:border-teal-dark text-text text-sm transition-all"
                style={{ width: '100%', padding: '12px 40px 12px 40px', background: 'var(--color-surface-low)', border: '1px solid rgba(71,241,228,0.15)', borderRadius: '4px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-teal transition-colors"
                style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: '12px', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-p mt-4 py-3 flex items-center justify-center gap-2 font-black transition-all"
            style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            <span>{loading ? 'A processar...' : 'Entrar na Conta'}</span>
            {!loading && <ArrowRight weight="bold" size={16} />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[rgba(255,255,255,0.03)] pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '24px' }}>
          <p className="text-xs text-muted" style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
            Ainda não tens acesso? Fala com a equipa comercial.
          </p>
          <a href="/#contacto" className="text-xs font-bold text-teal hover:underline mt-2 block" style={{ color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', display: 'block', marginTop: '8px' }}>
            Voltar para o site principal
          </a>
        </div>
      </div>
    </main>
  );
}
