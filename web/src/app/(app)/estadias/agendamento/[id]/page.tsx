import type { Metadata } from 'next';

import { Cabecalho } from '@/components/cabecalho';
import { FormAgendamento } from '@/features/estadias/components/form-agendamento';

export const metadata: Metadata = { title: 'Editar agendamento' };

/**
 * No Next 16 `params` e uma Promise — a pagina e `async` e espera por ela.
 * (No expo-router era o hook `useLocalSearchParams`.)
 */
export default async function PaginaEditarAgendamento(
  props: PageProps<'/estadias/agendamento/[id]'>,
) {
  const { id } = await props.params;
  return (
    <>
      <Cabecalho titulo="Editar agendamento" voltarPara="/estadias/agendamentos" />
      {/* `key`: ao pular de uma ocorrencia da serie para outra, a rota e a
          mesma e o React reaproveitaria o formulario com o estado antigo. */}
      <FormAgendamento key={id} agendamentoId={id} />
    </>
  );
}
