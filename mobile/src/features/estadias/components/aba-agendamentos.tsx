import { useRouter } from 'expo-router';
import { useMemo } from 'react';
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

/**
 * Uma linha da lista: ou um agendamento solto, ou uma serie recorrente
 * inteira representada por uma unica entrada.
 */
interface Linha {
  chave: string;
  /** A ocorrencia que da o rosto da linha (a proxima ainda por vir). */
  destaque: Agendamento;
  /** > 1 quando a linha resume uma serie. */
  total: number;
  restantes: number;
  /** Quantas ocorrencias falharam ao espelhar no Google. */
  comFalhaSync: number;
}

/**
 * Colapsa series recorrentes em uma linha so.
 *
 * Uma creche de 3x por semana durante 3 meses gera ~36 ocorrencias; lista-las
 * individualmente afogava todo o resto. A linha mostra a proxima ocorrencia
 * futura — nao a primeira da serie, que costuma ja ter passado.
 */
function agruparSeries(agendamentos: Agendamento[]): Linha[] {
  const agora = Date.now();
  const series = new Map<string, Agendamento[]>();
  const linhas: Linha[] = [];

  for (const a of agendamentos) {
    const serie = a.agendamentoRecorrenciaId;
    if (!serie) {
      linhas.push({
        chave: a.id,
        destaque: a,
        total: 1,
        restantes: 0,
        comFalhaSync: a.googleSyncErro ? 1 : 0,
      });
      continue;
    }
    const atual = series.get(serie);
    if (atual) atual.push(a);
    else series.set(serie, [a]);
  }

  for (const [serie, itens] of series) {
    const ordenados = [...itens].sort(
      (x, y) => x.dataHoraInicio.getTime() - y.dataHoraInicio.getTime(),
    );
    const ativas = ordenados.filter((a) => a.status !== 'cancelado');
    const futuras = ativas.filter((a) => a.dataHoraInicio.getTime() >= agora);
    linhas.push({
      chave: serie,
      // Toda a serie no passado: mostramos a ultima, para nao sumir da lista.
      destaque: futuras[0] ?? ativas[ativas.length - 1] ?? ordenados[0],
      total: ordenados.length,
      restantes: futuras.length,
      // Uma ocorrencia com falha ja basta para a serie merecer aviso.
      comFalhaSync: ordenados.filter((a) => a.googleSyncErro).length,
    });
  }

  return linhas.sort(
    (a, b) =>
      a.destaque.dataHoraInicio.getTime() - b.destaque.dataHoraInicio.getTime(),
  );
}

export function AbaAgendamentos() {
  const router = useRouter();
  const { data, isPending, error, refetch, isRefetching } = useAgendamentos();
  const { filtro, limparTudo } = useFiltroAgendamentos();

  const linhas = useMemo(() => agruparSeries(data ?? []), [data]);

  return (
    <View style={estilos.tela}>
      <PainelFiltros />

      {isPending ? (
        <Carregando />
      ) : error ? (
        <EstadoErro mensagem={String(error)} aoTentarNovamente={() => refetch()} />
      ) : linhas.length === 0 ? (
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
          data={linhas}
          keyExtractor={(l) => l.chave}
          contentContainerStyle={s.lista}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <Cartao linha={item} />}
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

function Cartao({ linha }: { linha: Linha }) {
  const router = useRouter();
  const a = linha.destaque;
  const cancelado = a.status === 'cancelado';
  const serie = linha.total > 1;

  return (
    <Pressable
      style={[estilos.cartao, s.cartao]}
      onPress={() => router.push(`/estadias/agendamento/${a.id}`)}
    >
      {/*
        O tutor virou o principal — e ele quem reserva. Os caes vem logo
        abaixo, porque um mesmo agendamento pode atender varios.
      */}
      <View style={s.topo}>
        <Text style={[s.nome, cancelado && s.nomeCancelado]}>
          {a.animais?.[0]?.tutor?.nomeCompleto ?? 'Tutor'}
        </Text>
        <ChipStatus status={a.status} />
      </View>

      {a.animais && a.animais.length > 0 ? (
        <Text style={s.tutor}>
          {a.animais.length > 1 ? 'Cães: ' : 'Cão: '}
          {a.animais.map((c) => c.nome).join(', ')}
        </Text>
      ) : null}

      {linha.comFalhaSync > 0 && !cancelado ? (
        // Falha de sync nao invalida o agendamento — ele vale no app de
        // qualquer forma. O aviso existe porque o Google e hoje a unica
        // visao por data, e um erro silencioso passaria despercebido.
        <View style={s.avisoSync}>
          <Text style={s.avisoSyncTexto}>
            ⚠️ Não apareceu no Google Agenda
            {linha.total > 1 ? ` (${linha.comFalhaSync} de ${linha.total})` : ''}
          </Text>
        </View>
      ) : null}

      <View style={s.meta}>
        <ChipTipo tipo={a.tipo} />
        <Text style={s.periodo}>
          {serie ? 'Próxima: ' : ''}
          {formatarIntervalo(a.dataHoraInicio, a.dataHoraFim)}
        </Text>
      </View>

      {serie || a.planoEstadia?.valorTotal != null ? (
        <View style={s.rodape}>
          {serie ? (
            <Text style={s.serie}>
              🔁 {linha.total} ocorrências
              {linha.restantes > 0 ? ` · ${linha.restantes} a vir` : ' · encerrada'}
            </Text>
          ) : (
            <View />
          )}
          {a.planoEstadia?.valorTotal != null ? (
            // Na Creche o valor e da diaria; sem o sufixo, o numero de uma
            // ocorrencia parece o total da serie.
            <Text style={s.valor}>
              {formatarMoeda(a.planoEstadia.valorTotal)}
              {a.tipo === 'creche' ? '/dia' : ''}
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
  avisoSync: {
    backgroundColor: cores.acento,
    borderRadius: raio.sm,
    paddingVertical: espaco.sm - 2,
    paddingHorizontal: espaco.sm,
  },
  avisoSyncTexto: {
    fontSize: 12,
    color: cores.primariaEscura,
    fontWeight: '600',
  },
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
