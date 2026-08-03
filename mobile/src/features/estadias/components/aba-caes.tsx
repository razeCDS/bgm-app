import { useRouter } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Carregando, EstadoErro, EstadoVazio } from '../../../components/estados';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
import { useAnimais, useBuscaAnimais } from '../hooks';
import type { Animal } from '../types/modelos';
import { resumoAnimal } from '../types/modelos';

export function AbaCaes() {
  const router = useRouter();
  const { busca, definir, limpar } = useBuscaAnimais();
  const { data, isPending, error, refetch, isRefetching } = useAnimais();

  return (
    <View style={estilos.tela}>
      <View style={s.barraBusca}>
        <TextInput
          value={busca}
          onChangeText={definir}
          placeholder="Buscar por nome, raça ou tutor…"
          placeholderTextColor={cores.textoSuave}
          style={[estilos.campo, s.campoBusca]}
        />
        {busca ? (
          <Pressable onPress={limpar} style={s.limpar} hitSlop={8}>
            <Text style={s.limparTexto}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {isPending ? (
        <Carregando />
      ) : error ? (
        <EstadoErro mensagem={String(error)} aoTentarNovamente={() => refetch()} />
      ) : data.length === 0 ? (
        <EstadoVazio
          icone="🐾"
          titulo={busca ? 'Nenhum resultado' : 'Nenhum cão cadastrado'}
          descricao={
            busca
              ? 'Tente outro termo de busca.'
              : 'Toque em + para cadastrar o primeiro cliente.'
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={s.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <Cartao animal={item} />}
        />
      )}

      <Pressable
        style={s.fab}
        onPress={() => router.push('/estadias/animal/novo')}
      >
        <Text style={s.fabTexto}>+ Novo cliente</Text>
      </Pressable>
    </View>
  );
}

function Cartao({ animal }: { animal: Animal }) {
  const router = useRouter();
  const resumo = resumoAnimal(animal);

  return (
    <Pressable
      style={[estilos.cartao, s.cartao]}
      onPress={() => router.push(`/estadias/animal/${animal.id}`)}
    >
      <View style={s.avatar}>
        <Text style={s.avatarIcone}>
          {animal.especie === 'felina' ? '🐈' : '🐕'}
        </Text>
      </View>
      <View style={s.info}>
        <Text style={s.nome}>{animal.nome}</Text>
        {resumo ? <Text style={s.resumo}>{resumo}</Text> : null}
        {animal.tutor ? (
          <Text style={s.tutor}>👤 {animal.tutor.nomeCompleto}</Text>
        ) : null}
      </View>
      <Text style={s.seta}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  barraBusca: {
    backgroundColor: cores.neutraClara,
    padding: espaco.md,
    justifyContent: 'center',
  },
  campoBusca: { backgroundColor: cores.branco },
  limpar: { position: 'absolute', right: espaco.xl },
  limparTexto: { color: cores.textoSuave, fontSize: 16 },
  lista: { padding: espaco.md, paddingBottom: 96, gap: espaco.md - 2 },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: espaco.md + 2 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: raio.lg,
    backgroundColor: cores.acentoTenue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcone: { fontSize: 26 },
  info: { flex: 1, gap: 2 },
  nome: { fontSize: 16, fontWeight: '700', color: cores.textoEscuro },
  resumo: { fontSize: 13, color: cores.textoSuave },
  tutor: { fontSize: 12, color: cores.textoSuave },
  seta: { fontSize: 24, color: cores.neutra },
  fab: {
    position: 'absolute',
    right: espaco.lg,
    bottom: espaco.lg,
    backgroundColor: cores.acento,
    paddingHorizontal: espaco.xl,
    paddingVertical: espaco.md + 2,
    borderRadius: raio.pill,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabTexto: { color: cores.primariaEscura, fontWeight: '700', fontSize: 15 },
});
