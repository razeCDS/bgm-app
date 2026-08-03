import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

/**
 * Credenciais do Supabase.
 *
 * No Expo, variaveis com prefixo `EXPO_PUBLIC_` sao embutidas no bundle.
 * Defina-as em um arquivo `.env` na raiz de `mobile/` (nao versionado):
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
 *
 * Enquanto `supabaseConfigurado` for `false`, o app roda com os
 * repositorios em memoria.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const chave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigurado = url.length > 0 && chave.length > 0;

export const supabase = supabaseConfigurado
  ? createClient(url, chave, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // React Native nao tem URL de callback como o navegador.
        detectSessionInUrl: false,
      },
    })
  : null;

/** Uso interno das implementacoes Supabase, que so rodam quando configurado. */
export function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase nao configurado. Defina EXPO_PUBLIC_SUPABASE_URL e ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
