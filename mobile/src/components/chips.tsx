import { StyleSheet, Text, View } from 'react-native';

import { cores } from '../theme/cores';
import { espaco, raio } from '../theme/estilos';
import {
  rotuloStatus,
  rotuloTipo,
  type StatusAgendamento,
  type TipoAgendamento,
} from '../features/estadias/types/enums';

const paletaStatus: Record<
  StatusAgendamento,
  { fundo: string; texto: string }
> = {
  solicitado: { fundo: cores.neutraClara, texto: cores.textoSuave },
  confirmado: { fundo: cores.primariaTenue, texto: cores.primariaEscura },
  em_andamento: { fundo: cores.acento, texto: cores.primariaEscura },
  concluido: { fundo: cores.neutraTenue, texto: cores.textoEscuro },
  cancelado: { fundo: cores.erroTenue, texto: cores.erro },
};

export function ChipStatus({ status }: { status: StatusAgendamento }) {
  const { fundo, texto } = paletaStatus[status];
  return (
    <View style={[s.chip, { backgroundColor: fundo }]}>
      <Text style={[s.chipTexto, { color: texto }]}>{rotuloStatus[status]}</Text>
    </View>
  );
}

const iconeTipo: Record<TipoAgendamento, string> = {
  visita: '🤝',
  hotel: '🏨',
  creche: '☀️',
};

export function ChipTipo({ tipo }: { tipo: TipoAgendamento }) {
  return (
    <View style={s.linha}>
      <Text style={s.icone}>{iconeTipo[tipo]}</Text>
      <Text style={s.tipoTexto}>{rotuloTipo[tipo]}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: espaco.sm + 2,
    paddingVertical: espaco.xs + 1,
    borderRadius: raio.pill,
  },
  chipTexto: { fontSize: 12, fontWeight: '600' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  icone: { fontSize: 13 },
  tipoTexto: { fontSize: 12, color: cores.textoSuave, fontWeight: '500' },
});
