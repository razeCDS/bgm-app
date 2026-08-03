import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { cores } from '../theme/cores';
import { espaco, estilos } from '../theme/estilos';

export function Carregando() {
  return (
    <View style={s.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
    </View>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: string;
  titulo: string;
  descricao?: string;
  acao?: { texto: string; aoTocar: () => void };
}) {
  return (
    <View style={s.centro}>
      <Text style={s.icone}>{icone}</Text>
      <Text style={s.titulo}>{titulo}</Text>
      {descricao ? <Text style={s.descricao}>{descricao}</Text> : null}
      {acao ? (
        <Pressable
          onPress={acao.aoTocar}
          style={[estilos.botaoSecundario, s.acao]}
        >
          <Text style={estilos.botaoSecundarioTexto}>{acao.texto}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EstadoErro({
  mensagem,
  aoTentarNovamente,
}: {
  mensagem: string;
  aoTentarNovamente?: () => void;
}) {
  return (
    <View style={s.centro}>
      <Text style={s.icone}>⚠️</Text>
      <Text style={s.titulo}>Algo deu errado</Text>
      <Text style={s.descricao}>{mensagem}</Text>
      {aoTentarNovamente ? (
        <Pressable
          onPress={aoTentarNovamente}
          style={[estilos.botaoSecundario, s.acao]}
        >
          <Text style={estilos.botaoSecundarioTexto}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.xxl + 8,
  },
  icone: { fontSize: 44, marginBottom: espaco.md },
  titulo: {
    fontSize: 17,
    fontWeight: '600',
    color: cores.textoEscuro,
    textAlign: 'center',
  },
  descricao: {
    marginTop: espaco.xs + 2,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  acao: { marginTop: espaco.xl },
});
