import {
  AuthFake,
  AuthSupabase,
  type AuthRepositorio,
} from '../features/auth/repositorio';
import type { EstadiasRepositorio } from '../features/estadias/data/repositorio';
import { RepositorioFake } from '../features/estadias/data/repositorio-fake';
import { RepositorioSupabase } from '../features/estadias/data/repositorio-supabase';
import { supabaseConfigurado } from './supabase';

/**
 * Ponto UNICO de chaveamento entre as implementacoes em memoria e as reais.
 *
 * A decisao e automatica e vem de `supabaseConfigurado` (ver `./supabase.ts`):
 * basta existir um `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` para o app passar a falar com o banco real.
 * Sem eles, cai no modo em memoria com dados de exemplo.
 *
 * Nenhum outro arquivo deve instanciar repositorio: sempre importe daqui.
 */
export type ModoDados = 'supabase' | 'memoria';

export const modoDados: ModoDados = supabaseConfigurado
  ? 'supabase'
  : 'memoria';

export const emMemoria = modoDados === 'memoria';

export const estadiasRepositorio: EstadiasRepositorio = supabaseConfigurado
  ? new RepositorioSupabase()
  : new RepositorioFake();

export const authRepositorio: AuthRepositorio = supabaseConfigurado
  ? new AuthSupabase()
  : new AuthFake();
