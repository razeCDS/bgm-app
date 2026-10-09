import type { Metadata } from 'next';

import { Cabecalho } from '@/components/cabecalho';
import { FormAgendamento } from '@/features/estadias/components/form-agendamento';

export const metadata: Metadata = { title: 'Novo agendamento' };

export default function PaginaNovoAgendamento() {
  return (
    <>
      <Cabecalho titulo="Novo agendamento" voltarPara="/estadias/agendamentos" />
      <FormAgendamento />
    </>
  );
}
