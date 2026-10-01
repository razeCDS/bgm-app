import { RepositorioFake } from '../../features/estadias/data/repositorio-fake';
import { RepositorioSupabase } from '../../features/estadias/data/repositorio-supabase';
import {
  AuthFake,
  AuthSupabase,
  type AuthRepositorio,
} from '../../features/auth/repositorio';
import { authRepositorio, emMemoria, estadiasRepositorio, modoDados } from '../repositorios';
import { describe, expect, it } from 'vitest';

/**
 * O chaveamento e resolvido na carga do modulo a partir das variaveis
 * NEXT_PUBLIC_SUPABASE_*. No ambiente de teste elas nao existem, entao o
 * esperado e cair no modo em memoria.
 */
describe('Chaveamento de repositorio', () => {
  it('sem credenciais, usa as implementacoes em memoria', () => {
    expect(modoDados).toBe('memoria');
    expect(emMemoria).toBe(true);
    expect(estadiasRepositorio).toBeInstanceOf(RepositorioFake);
    expect(authRepositorio).toBeInstanceOf(AuthFake);
  });

  it('as duas implementacoes de estadias cumprem o mesmo contrato', () => {
    const metodos = [
      'listarTutores',
      'salvarTutor',
      'listarAnimais',
      'obterFicha',
      'salvarAnimal',
      'salvarFicha',
      'listarAgendamentos',
      'obterAgendamento',
      'listarOcorrencias',
      'criarAgendamento',
      'atualizarAgendamento',
      'cancelarAgendamento',
      'cancelarSerie',
    ] as const;

    const fake = new RepositorioFake(false);
    const real = new RepositorioSupabase();

    for (const m of metodos) {
      expect(typeof fake[m]).toBe('function');
      expect(typeof real[m]).toBe('function');
    }
  });

  it('as duas implementacoes de auth cumprem o mesmo contrato', () => {
    for (const impl of [new AuthFake(), new AuthSupabase()]) {
      expect(typeof impl.usuarioAtual).toBe('function');
      expect(typeof impl.entrar).toBe('function');
      expect(typeof impl.sair).toBe('function');
    }
  });

  it('so a implementacao Supabase escuta mudancas de sessao', () => {
    // `aoMudarSessao` e opcional no contrato: tipar pela interface para o
    // membro ficar visivel nas duas implementacoes.
    const fake: AuthRepositorio = new AuthFake();
    const real: AuthRepositorio = new AuthSupabase();

    // O fake nao tem sessao persistida, entao nao implementa o gancho.
    expect(fake.aoMudarSessao).toBeUndefined();
    expect(typeof real.aoMudarSessao).toBe('function');
  });
});
