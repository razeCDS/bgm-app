import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipStatus, ChipTipo } from '../../../components/chips';
import { Carregando, EstadoErro, EstadoVazio } from '../../../components/estados';
import { formatarIntervalo, formatarMoeda } from '../../../lib/formatadores';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
import { useAgendamentos, useFiltroAgendamentos } from '../hooks';
import type { Agendamento } from '../types/modelos';
import { filtroEstaVazio } from '../types/modelos';
import { PainelFiltros } from './painel-filtros';

export function AbaAgendamentos() {
  const router = useRouter();
  const { data, isPending, error, refetch, isRefetching } = useAgendamentos();
  const { filtro, limparTudo } = useFiltroAgendamentos();

  return (
    <View style={estilos.tela}>
      <PainelFiltros />

      {isPending ? (
        <Carregando />
      ) : error ? (
        <EstadoErro mensagem={String(error)} aoTentarNovamente={() => refetch()} />
      ) : data.length === 0 ? (
        <EstadoVazio
          icone="📭"
          titulo={
            filtroEstaVazio(filtro)
              ? 'Nenhum agendamento'
              : 'Nenhum resultado para os filtros'
          }
          descricao={
            filtroEstaVazio(filtro)
              ? 'Toque em + para criar o primeiro agendamento.'
              : 'Ajuste ou limpe os filtros para ver mais.'
          }
          acao={
            filtroEstaVazio(filtro)
              ? undefined
              : { texto: 'Limpar filtros', aoTocar: limparTudo }
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={s.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <Cartao agendamento={item} />}
        />
      )}

      <Pressable
        style={s.fab}
        onPress={() => router.push('/estadias/agendamento/novo')}
      >
        <Text style={s.fabTexto}>+ Novo</Text>
      </Pressable>
    </View>
  );
}

function Cartao({ agendamento: a }: { agendamento: Agendamento }) {
  const router = useRouter();
  const cancelado = a.status === 'cancelado';

  return (
    <Pressable
      style={[estilos.cartao, s.cartao]}
      onPress={() => router.push(`/estadias/agendamento/${a.id}`)}
    >
      <View style={s.topo}>
        <Text style={[s.nome, cancelado && s.nomeCancelado]}>
          {a.animal?.nome ?? 'Animal'}
        </Text>
        <ChipStatus status={a.status} />
      </View>

      {a.animal?.tutor ? (
        <Text style={s.tutor}>Tutor: {a.animal.tutor.nomeCompleto}</Text>
      ) : null}

      <View style={s.meta}>
        <ChipTipo tipo={a.tipo} />
        <Text style={s.periodo}>
          {formatarIntervalo(a.dataHoraInicio, a.dataHoraFim)}
        </Text>
      </View>

      {a.agendamentoRecorrenciaId || a.planoEstadia?.valorTotal != null ? (
        <View style={s.rodape}>
          {a.agendamentoRecorrenciaId ? (
            <Text style={s.serie}>🔁 Série recorrente</Text>
          ) : (
            <View />
          )}
          {a.planoEstadia?.valorTotal != null ? (
            <Text style={s.valor}>
              {formatarMoeda(a.planoEstadia.valorTotal)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  lista: { padding: espaco.md, paddingBottom: 96, gap: espaco.md - 2 },
  cartao: { gap: espaco.sm },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
  },
  nome: { flex: 1, fontSize: 16, fontWeight: '700', color: cores.textoEscuro },
  nomeCancelado: {
    color: cores.textoSuave,
    textDecorationLine: 'line-through',
  },
  tutor: { fontSize: 13, color: cores.textoSuave },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    flexWrap: 'wrap',
  },
  periodo: { flex: 1, fontSize: 12, color: cores.textoSuave },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serie: { fontSize: 12, color: cores.primaria, fontWeight: '500' },
  valor: { fontSize: 13, fontWeight: '600', color: cores.primariaEscura },
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
