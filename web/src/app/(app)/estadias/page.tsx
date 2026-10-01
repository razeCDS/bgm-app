import { redirect } from 'next/navigation';

/** `/estadias` abre na primeira aba. */
export default function PaginaEstadias() {
  redirect('/estadias/agendamentos');
}
