import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Calendario,
  chaveDia,
  diasNoIntervalo,
  type Marcador,
} from '../../../components/calendario';
import { ChipStatus, ChipTipo } from '../../../components/chips';
import { Carregando, EstadoErro } from '../../../components/estados';
import { formatarHora, formatarMoeda } from '../../../lib/formatadores';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
import { useAgendamentosDoMes } from '../hooks';
import type { TipoAgendamento } from '../types/enums';
import type { Agendamento } from '../types/modelos';

/** Cor do marcador por tipo de agendamento. */
const corDoTipo: Record<TipoAgendamento, string> = {
  visita: cores.neutra,
  hotel: cores.primaria,
  creche: cores.acento,
};

export function AbaAgenda() {
  const [mes, setMes] = useState(() => new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(
    () => new Date(),
  );
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  const { data, isPending, error, refetch } = useAgendamentosDoMes(mes);

  const visiveis = useMemo(
    () =>
      (data ?? []).filter(
        (a) => mostrarCancelados || a.status !== 'cancelado',
      ),
    [data, mostrarCancelados],
  );

  /**
   * Um agendamento marca TODOS os dias que ocupa, nao so o de entrada:
   * uma hospedagem de 18 a 22 significa o cao presente nos cinco dias.
   */
  const marcadores = useMemo(() => {
    const mapa: Record<string, Marcador[]> = {};
    for (const a of visiveis) {
      for (const dia of diasNoIntervalo(a.dataHoraInicio, a.dataHoraFim)) {
        const chave = chaveDia(dia);
        (mapa[chave] ??= []).push({ cor: corDoTipo[a.tipo] });
      }
    }
    return mapa;
  }, [visiveis]);

  const doDia = useMemo(() => {
    if (!diaSelecionado) return [];
    return visiveis
      .filter((a) =>
        diasNoIntervalo(a.dataHoraInicio, a.dataHoraFim).some((d) =>
          isSameDay(d, diaSelecionado),
        ),
      )
      .sort((a, b) => a.dataHoraInicio.getTime() - b.dataHoraInicio.getTime());
  }, [visiveis, diaSelecionado]);

  if (isPending) return <Carregando />;
  if (error) {
    return <EstadoErro mensagem={String(error)} aoTentarNovamente={() => refetch()} />;
  }

  return (
    <View style={estilos.tela}>
      <Calendario
        mes={mes}
        diaSelecionado={diaSelecionado}
        marcadores={marcadores}
        aoSelecionarDia={setDiaSelecionado}
        aoMudarMes={(novo) => setMes(novo)}
      />

      <View style={s.legenda}>
        {(['visita', 'hotel', 'creche'] as TipoAgendamento[]).map((t) => (
          <View key={t} style={s.itemLegenda}>
            <View style={[s.ponto, { backgroundColor: corDoTipo[t] }]} />
            <Text style={s.legendaTexto}>
              {t === 'visita' ? 'Visita' : t === 'hotel' ? 'Hotel' : 'Creche'}
            </Text>
          </View>
        ))}
        <View style={s.espacador} />
        <Pressable
          onPress={() => setMostrarCancelados((v) => !v)}
          hitSlop={8}
          style={[s.alternador, mostrarCancelados && s.alternadorAtivo]}
        >
          <Text
            style={[
              s.alternadorTexto,
              mostrarCancelados && s.alternadorTextoAtivo,
            ]}
          >
            Cancelados
          </Text>
        </Pressable>
      </View>

      <View style={s.tituloDia}>
        <Text style={s.tituloDiaTexto}>
          {diaSelecionado
            ? format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR })
            : 'Selecione um dia'}
        </Text>
        <Text style={s.contagem}>
          {doDia.length === 0
            ? 'sem agendamentos'
            : `${doDia.length} ${doDia.length === 1 ? 'agendamento' : 'agendamentos'}`}
        </Text>
      </View>

      <FlatList
        data={doDia}
        keyExtractor={(a) => a.id}
        contentContainerStyle={s.lista}
        ListEmptyComponent={
          <Text style={s.vazio}>Nenhum agendamento neste dia.</Text>
        }
        renderItem={({ item }) => (
          <ItemDia agendamento={item} dia={diaSelecionado!} />
        )}
      />
    </View>
  );
}

function ItemDia({
  agendamento: a,
  dia,
}: {
  agendamento: Agendamento;
  dia: Date;
}) {
  const router = useRouter();
  const cancelado = a.status === 'cancelado';

  // Numa estadia de varios dias, so o primeiro dia tem "entrada" e so o
  // ultimo tem "saida" — nos dias do meio o cao apenas permanece.
  const ehEntrada = isSameDay(a.dataHoraInicio, dia);
  const ehSaida = a.dataHoraFim ? isSameDay(a.dataHoraFim, dia) : ehEntrada;

  const horario = ehEntrada
    ? `entrada ${formatarHora(a.dataHoraInicio)}`
    : ehSaida && a.dataHoraFim
      ? `saída ${formatarHora(a.dataHoraFim)}`
      : 'permanece o dia';

  return (
    <Pressable
      style={[estilos.cartao, s.cartao, cancelado && s.cartaoCancelado]}
      onPress={() => router.push(`/estadias/agendamento/${a.id}`)}
    >
      <View
        style={[s.faixa, { backgroundColor: corDoTipo[a.tipo] }]}
      />
      <View style={s.conteudo}>
        <View style={s.topo}>
          <Text style={[s.nome, cancelado && s.nomeCancelado]}>
            {a.animal?.nome ?? 'Animal'}
          </Text>
          <ChipStatus status={a.status} />
        </View>

        {a.animal?.tutor ? (
          <Text style={s.tutor}>{a.animal.tutor.nomeCompleto}</Text>
        ) : null}

        <View style={s.meta}>
          <ChipTipo tipo={a.tipo} />
          <Text style={s.horario}>· {horario}</Text>
          {a.planoEstadia?.valorTotal != null ? (
            <Text style={s.valor}>
              {formatarMoeda(a.planoEstadia.valorTotal)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  legenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    backgroundColor: cores.neutraClara,
  },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  ponto: { width: 7, height: 7, borderRadius: 4 },
  legendaTexto: { fontSize: 11, color: cores.textoSuave },
  espacador: { flex: 1 },
  alternador: {
    paddingHorizontal: espaco.sm + 2,
    paddingVertical: 3,
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: cores.neutra,
  },
  alternadorAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  alternadorTexto: { fontSize: 11, color: cores.textoSuave },
  alternadorTextoAtivo: { color: cores.branco, fontWeight: '600' },

  tituloDia: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
    paddingBottom: espaco.sm,
  },
  tituloDiaTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: cores.primariaEscura,
    textTransform: 'capitalize',
  },
  contagem: { fontSize: 12, color: cores.textoSuave },

  lista: { paddingHorizontal: espaco.md, paddingBottom: espaco.xxl, gap: espaco.sm },
  vazio: {
    textAlign: 'center',
    color: cores.textoSuave,
    paddingVertical: espaco.xl,
  },
  cartao: { flexDirection: 'row', padding: 0, overflow: 'hidden' },
  cartaoCancelado: { opacity: 0.6 },
  faixa: { width: 4 },
  conteudo: { flex: 1, padding: espaco.md, gap: espaco.xs },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
  },
  nome: { flex: 1, fontSize: 15, fontWeight: '700', color: cores.textoEscuro },
  nomeCancelado: {
    color: cores.textoSuave,
    textDecorationLine: 'line-through',
  },
  tutor: { fontSize: 12, color: cores.textoSuave },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    flexWrap: 'wrap',
  },
  horario: { fontSize: 12, color: cores.textoSuave },
  valor: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    color: cores.primariaEscura,
  },
});
