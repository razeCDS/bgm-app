import type { Metadata } from 'next';

import { AbaCaes } from '@/features/estadias/components/aba-caes';

export const metadata: Metadata = { title: 'Clientes' };

export default function PaginaClientes() {
  return <AbaCaes />;
}
