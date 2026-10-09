// Sobe o app em MODO DEMONSTRACAO: repositorios em memoria, com dados de
// exemplo, sem tocar no banco real.
//
//   npm run dev:demo
//
// Funciona porque o Next so le uma variavel do `.env.local` quando ela AINDA
// NAO existe no ambiente — e aqui ela existe, vazia. Com URL e chave vazias,
// `supabaseConfigurado` fica `false` e o app cai nos fakes.
//
// O login aceita qualquer e-mail com "@" e senha de 4+ caracteres.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const next = require.resolve('next/dist/bin/next');

const filho = spawn(process.execPath, [next, 'dev', '--port', '3001'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  },
});
filho.on('exit', (codigo) => process.exit(codigo ?? 0));
