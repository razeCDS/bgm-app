import type { Metadata } from 'next';

import { AbaAgendamentos } from '@/features/estadias/components/aba-agendamentos';

export const metadata: Metadata = { title: 'Agendamentos' };

export default function PaginaAgendamentos() {
  return <AbaAgendamentos />;
}
