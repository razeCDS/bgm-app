import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AbaAgenda } from '../../src/features/estadias/components/aba-agenda';
import { AbaAgendamentos } from '../../src/features/estadias/components/aba-agendamentos';
import { AbaCaes } from '../../src/features/estadias/components/aba-caes';
import { cores } from '../../src/theme/cores';
import { espaco } from '../../src/theme/estilos';

type Aba = 'agendamentos' | 'agenda' | 'caes';

/** Modulo BGM Estadias: navegacao em abas. */
export default function TelaEstadias() {
  const [aba, setAba] = useState<Aba>('agendamentos');
  return (
    <View style={s.tela}>
      <View style={s.abas}>
        <Botao
          texto="Agendamentos"
          icone="📋"
          ativo={aba === 'agendamentos'}
          aoTocar={() => setAba('agendamentos')}
        />
        <Botao
          texto="Agenda"
          icone="📅"
          ativo={aba === 'agenda'}
          aoTocar={() => setAba('agenda')}
        />
        <Botao
          texto="Cães"
          icone="🐾"
          ativo={aba === 'caes'}
          aoTocar={() => setAba('caes')}
        />
      </View>

      {aba === 'agendamentos' ? (
        <AbaAgendamentos />
      ) : aba === 'agenda' ? (
        <AbaAgenda />
      ) : (
        <AbaCaes />
      )}
    </View>
  );
}

function Botao({
  texto,
  icone,
  ativo,
  aoTocar,
}: {
  texto: string;
  icone: string;
  ativo: boolean;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      style={[s.aba, ativo && s.abaAtiva]}
      accessibilityRole="tab"
      accessibilityState={{ selected: ativo }}
    >
      <Text style={s.abaIcone}>{icone}</Text>
      <Text style={[s.abaTexto, ativo && s.abaTextoAtivo]}>{texto}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.branco },
  abas: { flexDirection: 'row', backgroundColor: cores.primaria },
  aba: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: espaco.sm + 2,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  abaAtiva: { borderBottomColor: cores.acento },
  abaIcone: { fontSize: 16 },
  abaTexto: { color: cores.brancoSuave, fontSize: 14, marginTop: 2 },
  abaTextoAtivo: { color: cores.branco, fontWeight: '700' },
});
