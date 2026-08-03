import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cores } from '../theme/cores';
import { espaco, raio } from '../theme/estilos';

/** Um marcador colorido exibido sob o numero do dia. */
export interface Marcador {
  cor: string;
}

export interface CalendarioProps {
  /** Qualquer data dentro do mes exibido. */
  mes: Date;
  diaSelecionado: Date | null;
  /** Marcadores por dia, indexados por `chaveDia`. */
  marcadores: Record<string, Marcador[]>;
  aoSelecionarDia: (dia: Date) => void;
  aoMudarMes: (novoMes: Date) => void;
}

/** Chave estavel de um dia (`yyyy-MM-dd`), usada para indexar marcadores. */
export const chaveDia = (d: Date) => format(d, 'yyyy-MM-dd');

/** Quantos pontos cabem antes de virar "+n". */
const MAX_PONTOS = 3;

/**
 * Monta a grade do mes: sempre 6 semanas de 7 dias, comecando no domingo.
 *
 * O tamanho fixo evita que a tela "pule" ao navegar entre meses de 4, 5 ou
 * 6 semanas. Dias de fora do mes vem junto e sao exibidos esmaecidos.
 */
export function semanasDoMes(mes: Date): Date[][] {
  const primeiro = startOfWeek(startOfMonth(mes), { weekStartsOn: 0 });
  const semanas: Date[][] = [];
  let cursor = primeiro;

  for (let semana = 0; semana < 6; semana++) {
    const dias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dias.push(cursor);
      cursor = addDays(cursor, 1);
    }
    semanas.push(dias);
  }
  return semanas;
}

/** Todos os dias entre inicio e fim (inclusive), normalizados. */
export function diasNoIntervalo(inicio: Date, fim: Date | null): Date[] {
  const primeiro = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    inicio.getDate(),
  );
  if (!fim) return [primeiro];

  const ultimo = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  if (ultimo < primeiro) return [primeiro];

  const dias: Date[] = [];
  let cursor = primeiro;
  // Limite de seguranca: uma estadia nao deveria passar de ~1 ano.
  while (cursor <= ultimo && dias.length < 400) {
    dias.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dias;
}

const CABECALHO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function Calendario({
  mes,
  diaSelecionado,
  marcadores,
  aoSelecionarDia,
  aoMudarMes,
}: CalendarioProps) {
  const hoje = new Date();
  const semanas = semanasDoMes(mes);

  const irPara = (delta: number) =>
    aoMudarMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <View style={s.painel}>
      <View style={s.cabecalho}>
        <Pressable onPress={() => irPara(-1)} hitSlop={12} style={s.seta}>
          <Text style={s.setaTexto}>‹</Text>
        </Pressable>

        <Pressable onPress={() => aoMudarMes(hoje)} hitSlop={8}>
          <Text style={s.titulo}>
            {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
          </Text>
        </Pressable>

        <Pressable onPress={() => irPara(1)} hitSlop={12} style={s.seta}>
          <Text style={s.setaTexto}>›</Text>
        </Pressable>
      </View>

      <View style={s.linha}>
        {CABECALHO.map((d, i) => (
          <View key={i} style={s.celula}>
            <Text style={s.diaSemana}>{d}</Text>
          </View>
        ))}
      </View>

      {semanas.map((semana, i) => (
        <View key={i} style={s.linha}>
          {semana.map((dia) => {
            const doMes = isSameMonth(dia, mes);
            const ehHoje = isSameDay(dia, hoje);
            const selecionado = diaSelecionado
              ? isSameDay(dia, diaSelecionado)
              : false;
            const pontos = marcadores[chaveDia(dia)] ?? [];

            return (
              <Pressable
                key={dia.toISOString()}
                style={s.celula}
                onPress={() => aoSelecionarDia(dia)}
              >
                <View
                  style={[
                    s.numeroCaixa,
                    ehHoje && s.hoje,
                    selecionado && s.selecionado,
                  ]}
                >
                  <Text
                    style={[
                      s.numero,
                      !doMes && s.foraDoMes,
                      (selecionado || ehHoje) && s.numeroDestacado,
                    ]}
                  >
                    {dia.getDate()}
                  </Text>
                </View>

                <View style={s.pontos}>
                  {pontos.slice(0, MAX_PONTOS).map((m, idx) => (
                    <View
                      key={idx}
                      style={[s.ponto, { backgroundColor: m.cor }]}
                    />
                  ))}
                  {pontos.length > MAX_PONTOS ? (
                    <Text style={s.excedente}>+{pontos.length - MAX_PONTOS}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  painel: {
    backgroundColor: cores.branco,
    paddingHorizontal: espaco.sm,
    paddingBottom: espaco.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: cores.neutra,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.sm,
  },
  seta: { paddingHorizontal: espaco.md },
  setaTexto: { fontSize: 26, color: cores.primaria, lineHeight: 28 },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.primariaEscura,
    textTransform: 'capitalize',
  },
  linha: { flexDirection: 'row' },
  celula: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  diaSemana: {
    fontSize: 11,
    fontWeight: '700',
    color: cores.textoSuave,
    paddingBottom: espaco.xs,
  },
  numeroCaixa: {
    width: 32,
    height: 32,
    borderRadius: raio.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoje: { borderWidth: 1.5, borderColor: cores.primaria },
  selecionado: { backgroundColor: cores.primaria },
  numero: { fontSize: 14, color: cores.textoEscuro },
  numeroDestacado: { fontWeight: '700' },
  foraDoMes: { color: cores.neutra },
  pontos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 8,
    marginTop: 1,
  },
  ponto: { width: 5, height: 5, borderRadius: 3 },
  excedente: { fontSize: 8, color: cores.textoSuave, marginLeft: 1 },
});
