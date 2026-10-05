'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Botao } from '../../../components/botoes';
import { Rotulo } from '../../../components/campos';
import { ROTA_INICIAL } from '../../../lib/rotas';
import { ErroAutenticacao } from '../repositorio';
import { useSessao } from '../store';

const caixa =
  'mb-3.5 w-full rounded-campo bg-neutra-clara px-3.5 py-3 text-base text-texto-escuro outline-none placeholder:text-texto-suave focus:ring-2 focus:ring-primaria/40';

export function TelaLogin() {
  const entrar = useSessao((s) => s.entrar);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Um <form> de verdade (e nao botao solto): Enter envia, e o gerenciador
  // de senhas do celular reconhece a tela de login e oferece preencher.
  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!email.includes('@')) return setErro('Informe um e-mail válido.');
    if (senha.length < 4) return setErro('A senha deve ter ao menos 4 caracteres.');

    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
      // A sessao ja esta no cookie: o proxy deixa passar. Vai direto para a
      // rota inicial, sem o salto extra pelo redirecionamento de `/`.
      router.replace(ROTA_INICIAL);
    } catch (e) {
      setErro(
        e instanceof ErroAutenticacao
          ? e.message
          : 'Não foi possível entrar. Tente novamente.',
      );
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-primaria px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex size-22 items-center justify-center rounded-full bg-acento text-4xl">
        🐾
      </div>
      <h1 className="mt-5 text-[26px] font-bold text-white">BGM Daycare</h1>
      <p className="mt-1 text-[15px] text-white/80">Gestão interna</p>

      <form
        onSubmit={submeter}
        className="mt-8 w-full max-w-[420px] rounded-xl bg-white p-5"
        noValidate
      >
        <Rotulo htmlFor="email">E-mail</Rotulo>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={caixa}
        />

        <Rotulo htmlFor="senha">Senha</Rotulo>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className={caixa}
        />

        {erro ? (
          <p role="alert" className="mb-3 rounded-lg bg-erro/10 p-3 text-[13px] text-erro">
            {erro}
          </p>
        ) : null}

        <Botao type="submit" carregando={carregando} className="w-full">
          Entrar
        </Botao>
      </form>

      <p className="mt-4 text-[13px] text-white/60">Acesso restrito à equipe.</p>
    </main>
  );
}
