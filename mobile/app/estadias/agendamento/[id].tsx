import { useLocalSearchParams } from 'expo-router';

import { FormAgendamento } from '../../../src/features/estadias/components/form-agendamento';

export default function EditarAgendamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FormAgendamento agendamentoId={id} />;
}
