import type { Metadata } from 'next';

import { TelaLogin } from '@/features/auth/components/tela-login';

export const metadata: Metadata = { title: 'Entrar' };

export default function PaginaLogin() {
  return <TelaLogin />;
}
