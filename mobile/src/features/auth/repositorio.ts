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
}

/**
 * Autenticacao de desenvolvimento: aceita qualquer credencial valida no
 * formato, sem consultar servidor.
 *
 * Existe apenas enquanto a integracao com o Supabase Auth nao esta ligada.
 * A troca para `AuthSupabase` nao exige mudanca nas telas.
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
    const { data } = await exigirSupabase().auth.getUser();
    const u = data.user;
    return u ? { id: u.id, email: u.email ?? '' } : null;
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    const { data, error } = await exigirSupabase().auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw new ErroAutenticacao(error.message);
    const u = data.user;
    if (!u) throw new ErroAutenticacao('Não foi possível entrar.');
    return { id: u.id, email: u.email ?? '' };
  }

  async sair(): Promise<void> {
    await exigirSupabase().auth.signOut();
  }
}
