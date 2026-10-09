import type { AuthError } from '@supabase/supabase-js';

import { exigirSupabase } from '../../lib/supabase';

export interface Usuario {
  id: string;
  email: string;
}

export class ErroAutenticacao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroAutenticacao';
  }
}

export interface AuthRepositorio {
  usuarioAtual(): Promise<Usuario | null>;
  entrar(email: string, senha: string): Promise<Usuario>;
  sair(): Promise<void>;
  /**
   * Notifica mudancas de sessao vindas de fora do app (restauracao do
   * armazenamento, refresh de token, expiracao). Opcional: implementacoes
   * sem sessao persistida podem omitir.
   */
  aoMudarSessao?(ouvinte: (usuario: Usuario | null) => void): void;
}

/**
 * Autenticacao de desenvolvimento: aceita qualquer credencial valida no
 * formato, sem consultar servidor. Ativa quando nao ha credenciais do
 * Supabase configuradas.
 */
export class AuthFake implements AuthRepositorio {
  private usuario: Usuario | null = null;

  async usuarioAtual(): Promise<Usuario | null> {
    return this.usuario;
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    await new Promise((r) => setTimeout(r, 400));
    if (!email.includes('@')) {
      throw new ErroAutenticacao('Informe um e-mail válido.');
    }
    if (senha.length < 4) {
      throw new ErroAutenticacao('A senha deve ter ao menos 4 caracteres.');
    }
    this.usuario = { id: 'dev-local', email };
    return this.usuario;
  }

  async sair(): Promise<void> {
    await new Promise((r) => setTimeout(r, 150));
    this.usuario = null;
  }
}

/**
 * Autenticacao real via Supabase Auth (e-mail/senha).
 * Nao ha auto-cadastro: os usuarios sao criados no painel.
 */
export class AuthSupabase implements AuthRepositorio {
  async usuarioAtual(): Promise<Usuario | null> {
    // `getSession` le do armazenamento local; nao faz round-trip de rede.
    const { data } = await exigirSupabase().auth.getSession();
    return paraUsuario(data.session?.user ?? null);
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    const { data, error } = await exigirSupabase().auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw new ErroAutenticacao(mensagemAmigavel(error));
    const usuario = paraUsuario(data.user);
    if (!usuario) throw new ErroAutenticacao('Não foi possível entrar.');
    return usuario;
  }

  async sair(): Promise<void> {
    await exigirSupabase().auth.signOut();
  }

  aoMudarSessao(ouvinte: (usuario: Usuario | null) => void): void {
    exigirSupabase().auth.onAuthStateChange((_evento, sessao) => {
      ouvinte(paraUsuario(sessao?.user ?? null));
    });
  }
}

function paraUsuario(u: { id: string; email?: string } | null): Usuario | null {
  return u ? { id: u.id, email: u.email ?? '' } : null;
}

/** Traduz os erros mais comuns do Supabase Auth. */
function mensagemAmigavel(erro: AuthError): string {
  const cru = erro.message.toLowerCase();

  if (cru.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (cru.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (cru.includes('too many requests') || erro.status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente de novo.';
  }
  if (cru.includes('network') || cru.includes('fetch')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  return erro.message;
}
