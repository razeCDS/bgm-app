import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Campo,
  LinhaSwitch,
  Secao,
  Seletor,
  SeletorDataHora,
  SeletorHora,
} from '../../../components/campos';
import { Carregando, EstadoErro } from '../../../components/estados';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
import {
  useAgendamento,
  useAnimais,
  useAtualizarAgendamento,
  useCancelarAgendamento,
  useCancelarSerie,
  useCriarAgendamento,
  useOcorrenciasSerie,
  useTutores,
} from '../hooks';
import { formatarData, formatarHora } from '../../../lib/formatadores';
import {
  comHorario,
  fimDaJanela,
  gerarOcorrencias,
  validarAgendamento,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import {
  abreviadoDiaSemana,
  DIAS_SEMANA,
  eAgendamentoBanho,
  exigePlanoEstadia,
  FORMAS_PAGAMENTO,
  permiteRecorrencia,
  rotuloFormaPagamento,
  rotuloStatus,
  rotuloTipo,
  rotuloTipoPlano,
  STATUS_AGENDAMENTO,
  temEstadia,
  TIPOS_AGENDAMENTO,
  TIPOS_PLANO,
  type DiaSemana,
  type FormaPagamento,
  type StatusAgendamento,
  type TipoAgendamento,
  type TipoPlano,
} from '../types/enums';

/**
 * Criacao e edicao de agendamento.
 *
 * Secoes condicionais:
 *  - Plano de estadia (rotina diaria): so Creche
 *  - Valor + Pertences: Hotel e Creche
 *  - Recorrencia: so Creche
 */
export function FormAgendamento({ agendamentoId }: { agendamentoId?: string }) {
  const router = useRouter();
  const editando = !!agendamentoId;

  const consulta = useAgendamento(agendamentoId);
  const animais = useAnimais();
  const tutores = useTutores();
  const criar = useCriarAgendamento();
  const atualizar = useAtualizarAgendamento();
  const cancelar = useCancelarAgendamento();
  const cancelarSerie = useCancelarSerie();

  // ── Estado do formulario ──
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [animalIds, setAnimalIds] = useState<string[]>([]);
  const [tipo, setTipo] = useState<TipoAgendamento>('creche');
  const [status, setStatus] = useState<StatusAgendamento>('solicitado');
  const [inicio, setInicio] = useState<Date>(new Date());
  const [fim, setFim] = useState<Date | null>(null);
  const [recorrente, setRecorrente] = useState(false);
  const [dias, setDias] = useState<DiaSemana[]>([]);
  // Creche recorrente: a janela e informada em semanas, nao com data final.
  const [semanas, setSemanas] = useState('4');
  const [observacoes, setObservacoes] = useState('');

  // Plano (creche)
  const [tipoPlano, setTipoPlano] = useState<TipoPlano | null>(null);
  const [totalDias, setTotalDias] = useState('');
  const [horaEntrada, setHoraEntrada] = useState<string | null>(null);
  const [horaSaida, setHoraSaida] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(
    null,
  );
  // Valor (hotel e creche)
  const [valorTotal, setValorTotal] = useState('');

  // Pertences
  const [temCaminha, setTemCaminha] = useState(false);
  const [corCaminha, setCorCaminha] = useState('');
  const [temRoupa, setTemRoupa] = useState(false);
  const [corRoupa, setCorRoupa] = useState('');
  const [temBrinquedo, setTemBrinquedo] = useState(false);
  const [qualBrinquedo, setQualBrinquedo] = useState('');
  const [racao, setRacao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [vezes, setVezes] = useState('');
  const [obsPertences, setObsPertences] = useState('');

  const [preenchido, setPreenchido] = useState(false);

  // Preenche o formulario quando o agendamento carrega (modo edicao).
  useEffect(() => {
    const a = consulta.data;
    if (!editando || !a || preenchido) return;

    setAnimalIds(a.animalIds);
    // O tutor nao e guardado no agendamento: deduzimos pelo primeiro cao.
    setTutorId(a.animais?.[0]?.tutorId ?? null);
    setTipo(a.tipo);
    setStatus(a.status);
    setInicio(a.dataHoraInicio);
    setFim(a.dataHoraFim);
    setRecorrente(a.recorrente);
    setDias(a.diasSemanaRecorrencia);
    if (a.recorrente && a.dataHoraFim) {
      // A duracao nao e persistida: as ocorrencias sao a verdade. Ao editar,
      // reconstruimos as semanas a partir da janela original.
      const dia = 86_400_000;
      const dias = Math.round(
        (new Date(a.dataHoraFim).setHours(0, 0, 0, 0) -
          new Date(a.dataHoraInicio).setHours(0, 0, 0, 0)) /
          dia,
      );
      setSemanas(String(Math.max(1, Math.ceil((dias + 1) / 7))));
    }
    setObservacoes(a.observacoes ?? '');

    const p = a.planoEstadia;
    setTipoPlano(p?.tipoPlano ?? null);
    setTotalDias(p?.totalDias != null ? String(p.totalDias) : '');
    setHoraEntrada(p?.horarioEntrada ?? null);
    setHoraSaida(p?.horarioSaida ?? null);
    setFormaPagamento(p?.formaPagamento ?? null);
    setValorTotal(p?.valorTotal != null ? String(p.valorTotal) : '');

    const d = a.pertencesDeixados;
    setTemCaminha(d?.temCaminha ?? false);
    setCorCaminha(d?.corCaminha ?? '');
    setTemRoupa(d?.temRoupa ?? false);
    setCorRoupa(d?.corRoupa ?? '');
    setTemBrinquedo(d?.temBrinquedo ?? false);
    setQualBrinquedo(d?.qualBrinquedo ?? '');
    setRacao(d?.racao ?? '');
    setQuantidade(d?.quantidade ?? '');
    setVezes(d?.vezes ?? '');
    setObsPertences(d?.observacoes ?? '');

    setPreenchido(true);
  }, [consulta.data, editando, preenchido]);

  const comPlano = exigePlanoEstadia(tipo);
  const comEstadia = temEstadia(tipo);
  const comRecorrencia = permiteRecorrencia(tipo);
  const eBanho = eAgendamentoBanho(tipo);

  const caesDoTutor = (animais.data ?? []).filter(
    (a) => a.tutorId === tutorId,
  );

  const numeroSemanas = Number(semanas);
  const semanasOk = Number.isInteger(numeroSemanas) && numeroSemanas > 0;

  function montarEntrada(): EntradaAgendamento {
    const valor = Number(valorTotal.replace(',', '.'));
    const valorOk = valorTotal.trim() !== '' && !Number.isNaN(valor);

    let plano: EntradaAgendamento['planoEstadia'] = null;
    if (comPlano) {
      // Creche: rotina diaria completa.
      const dias = Number(totalDias);
      plano = {
        tipoPlano,
        totalDias: totalDias.trim() !== '' && !Number.isNaN(dias) ? dias : null,
        horarioEntrada: horaEntrada,
        horarioSaida: horaSaida,
        formaPagamento,
        valorTotal: valorOk ? valor : null,
      };
    } else if ((comEstadia || eBanho) && valorOk) {
      // Hotel: nao tem plano; o valor da estadia e guardado sozinho.
      plano = {
        tipoPlano: null,
        totalDias: null,
        horarioEntrada: null,
        horarioSaida: null,
        formaPagamento: null,
        valorTotal: valor,
      };
    }

    // A Creche nao tem secao de Periodo: o horario vem do plano, e a janela
    // da recorrencia sai da duracao em semanas. Manter os dois lugares para
    // informar horario so criava divergencia — valia sempre o do plano.
    let dataInicio = inicio;
    let dataFim = fim;
    if (comPlano) {
      dataInicio = comHorario(inicio, horaEntrada);
      dataFim = recorrente
        ? comHorario(fimDaJanela(inicio, numeroSemanas), horaSaida)
        : horaSaida
          ? comHorario(inicio, horaSaida)
          : null;
    }

    return {
      animalIds,
      tipo,
      dataHoraInicio: dataInicio,
      dataHoraFim: dataFim,
      status,
      recorrente: recorrente && comRecorrencia,
      diasSemanaRecorrencia: comRecorrencia ? dias : [],
      observacoes: observacoes.trim() || null,
      planoEstadia: plano,
      pertencesDeixados: comEstadia
        ? {
            temCaminha,
            corCaminha: corCaminha.trim() || null,
            temRoupa,
            corRoupa: corRoupa.trim() || null,
            temBrinquedo,
            qualBrinquedo: qualBrinquedo.trim() || null,
            racao: racao.trim() || null,
            quantidade: quantidade.trim() || null,
            vezes: vezes.trim() || null,
            observacoes: obsPertences.trim() || null,
          }
        : null,
    };
  }

  async function salvar() {
    if (comPlano && recorrente && !semanasOk) {
      return Alert.alert(
        'Verifique os dados',
        'Informe a duração da recorrência em semanas (número inteiro maior que zero).',
      );
    }

    const entrada = montarEntrada();
    const erro = validarAgendamento(entrada);
    if (erro) return Alert.alert('Verifique os dados', erro);

    try {
      if (editando) {
        await atualizar.mutateAsync({ id: agendamentoId!, entrada });
      } else {
        const criados = await criar.mutateAsync(entrada);
        if (criados.length > 1) {
          Alert.alert('Pronto', `${criados.length} ocorrências criadas.`);
        }
      }
      router.back();
    } catch (e) {
      Alert.alert('Não foi possível salvar', String(e));
    }
  }

  /**
   * Cancela o restante da serie. O corte e "agora": ocorrencias que ja
   * comecaram permanecem, porque sao registro de frequencia — o cao esteve
   * la, e marca-las como canceladas falsearia o historico e a cobranca.
   */
  function confirmarCancelamentoSerie(recorrenciaId: string) {
    const agora = new Date();
    Alert.alert(
      'Cancelar série inteira',
      'Todas as ocorrências futuras desta série serão canceladas. ' +
        'As que já aconteceram são mantidas.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar série',
          style: 'destructive',
          onPress: async () => {
            try {
              const canceladas = await cancelarSerie.mutateAsync({
                recorrenciaId,
                aPartirDe: agora,
              });
              if (canceladas.length === 0) {
                Alert.alert(
                  'Nada a cancelar',
                  'Esta série não tem ocorrências futuras.',
                );
                return;
              }
              Alert.alert(
                'Pronto',
                `${canceladas.length} ocorrência${
                  canceladas.length > 1 ? 's canceladas' : ' cancelada'
                }.`,
              );
              router.back();
            } catch (e) {
              Alert.alert('Não foi possível cancelar a série', String(e));
            }
          },
        },
      ],
    );
  }

  function confirmarCancelamento() {
    Alert.alert(
      'Cancelar agendamento',
      'O agendamento será marcado como Cancelado. O registro não é apagado.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar agendamento',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelar.mutateAsync(agendamentoId!);
              router.back();
            } catch (e) {
              Alert.alert('Não foi possível cancelar', String(e));
            }
          },
        },
      ],
    );
  }

  if (editando && consulta.isPending) return <Carregando />;
  if (editando && consulta.error) {
    return <EstadoErro mensagem={String(consulta.error)} />;
  }

  const previsao =
    recorrente && comRecorrencia && semanasOk && dias.length > 0
      ? gerarOcorrencias(montarEntrada()).length
      : 0;

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <View style={estilos.tela}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Secao titulo="Dados principais">
          {/*
            O tutor e o principal: ele e quem reserva, e pode trazer mais de
            um cao no mesmo periodo. A lista de caes abaixo e filtrada por
            ele — nao ha como marcar caes de tutores diferentes no mesmo
            agendamento, o que manteria a cobranca e o contato ambiguos.
          */}
          <Seletor
            rotulo="Tutor *"
            valor={tutorId}
            opcoes={(tutores.data ?? []).map((t) => t.id)}
            rotuloDe={(id) =>
              tutores.data?.find((t) => t.id === id)?.nomeCompleto ?? id
            }
            aoSelecionar={(id) => {
              setTutorId(id);
              // Trocar de tutor invalida a selecao anterior de caes.
              if (id !== tutorId) setAnimalIds([]);
            }}
          />

          <Text style={estilos.rotuloCampo}>Cães *</Text>
          {!tutorId ? (
            <Text style={s.dica}>Selecione o tutor para listar os cães.</Text>
          ) : caesDoTutor.length === 0 ? (
            <Text style={s.dica}>Este tutor não possui cães cadastrados.</Text>
          ) : (
            <View style={s.caes}>
              {caesDoTutor.map((c) => {
                const marcado = animalIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() =>
                      setAnimalIds(
                        marcado
                          ? animalIds.filter((x) => x !== c.id)
                          : [...animalIds, c.id],
                      )
                    }
                    style={[s.cao, marcado && s.caoAtivo]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: marcado }}
                  >
                    <Text style={[s.caoTexto, marcado && s.caoTextoAtivo]}>
                      {marcado ? '✓ ' : ''}
                      {c.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Seletor
            rotulo="Tipo *"
            valor={tipo}
            opcoes={TIPOS_AGENDAMENTO}
            rotuloDe={(t) => rotuloTipo[t]}
            // Trocar o tipo depois de criado invalidaria plano, pertences e a
            // propria serie recorrente — cada tipo guarda dados diferentes.
            // Para mudar, cancela-se este e cria-se outro.
            bloqueado={editando}
            dicaBloqueio="O tipo não pode ser alterado. Cancele este agendamento e crie outro."
            aoSelecionar={(t) => {
              if (!t) return;
              setTipo(t);
              if (!permiteRecorrencia(t)) {
                setRecorrente(false);
                setDias([]);
              }
            }}
          />
          <Seletor
            rotulo="Status"
            valor={status}
            opcoes={STATUS_AGENDAMENTO}
            rotuloDe={(v) => rotuloStatus[v]}
            aoSelecionar={(v) => v && setStatus(v)}
          />
        </Secao>

        {comPlano ? (
          // Creche: so a data. O horario e definido no plano de estadia, e a
          // data final da serie vem da duracao em semanas.
          <Secao titulo={recorrente ? 'Início da recorrência' : 'Data'}>
            <SeletorDataHora
              rotulo={recorrente ? 'Primeiro dia *' : 'Dia *'}
              valor={inicio}
              aoMudar={setInicio}
              apenasData
            />
            <Text style={s.dica}>
              Os horários de entrada e saída são definidos no plano de estadia.
            </Text>
          </Secao>
        ) : (
          <Secao titulo="Período">
            <SeletorDataHora
              rotulo="Início *"
              valor={inicio}
              aoMudar={setInicio}
            />
            <SeletorDataHora
              rotulo="Fim"
              valor={fim}
              aoMudar={setFim}
              aoLimpar={() => setFim(null)}
            />
            <Text style={s.dica}>A data final é opcional.</Text>
          </Secao>
        )}

        {comRecorrencia ? (
          <Secao titulo="Recorrência">
            <LinhaSwitch
              titulo="Agendamento recorrente"
              descricao="Gera uma ocorrência por dia marcado, a partir do primeiro dia."
              valor={recorrente}
              aoMudar={setRecorrente}
            />
            {recorrente ? (
              <>
                <Campo
                  rotulo="Duração (semanas) *"
                  valor={semanas}
                  aoMudar={setSemanas}
                  teclado="number-pad"
                />
                <View style={s.dias}>
                  {DIAS_SEMANA.map((d) => {
                    const ativo = dias.includes(d);
                    return (
                      <Pressable
                        key={d}
                        onPress={() =>
                          setDias(
                            ativo ? dias.filter((x) => x !== d) : [...dias, d],
                          )
                        }
                        style={[s.dia, ativo && s.diaAtivo]}
                      >
                        <Text style={[s.diaTexto, ativo && s.diaTextoAtivo]}>
                          {abreviadoDiaSemana[d]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {previsao > 0 ? (
                  <Text style={s.previsao}>
                    Serão geradas {previsao} ocorrências, até{' '}
                    {formatarData(fimDaJanela(inicio, numeroSemanas))}.
                  </Text>
                ) : null}
              </>
            ) : null}
          </Secao>
        ) : null}

        {editando && consulta.data?.agendamentoRecorrenciaId ? (
          <SecaoSerie
            recorrenciaId={consulta.data.agendamentoRecorrenciaId}
            atualId={agendamentoId!}
          />
        ) : null}

        {comPlano ? (
          <Secao titulo="Plano de estadia">
            <Seletor
              rotulo="Tipo de plano"
              valor={tipoPlano}
              opcoes={TIPOS_PLANO}
              rotuloDe={(t) => rotuloTipoPlano[t]}
              aoSelecionar={setTipoPlano}
              permiteVazio
              textoVazio="Nenhum"
            />
            <View style={s.linha}>
              <SeletorHora
                rotulo="Entrada *"
                valor={horaEntrada}
                aoMudar={setHoraEntrada}
              />
              <SeletorHora
                rotulo="Saída *"
                valor={horaSaida}
                aoMudar={setHoraSaida}
              />
            </View>
            <Text style={s.dica}>
              Definem o horário de cada dia da creche — inclusive das
              ocorrências de uma recorrência.
            </Text>
            <Campo
              rotulo="Total de dias"
              valor={totalDias}
              aoMudar={setTotalDias}
              teclado="number-pad"
            />
          </Secao>
        ) : null}
        
        {comEstadia ? (
          <>
            <Secao titulo="Valor">
              {/*
                Creche: o valor e POR DIA. Cada ocorrencia da serie tem sua
                propria linha em `planos_estadia`, entao um valor de pacote
                aqui seria replicado em todas e qualquer soma daria o total
                multiplicado pelo numero de dias.
              */}
              <Campo
                rotulo={comPlano ? 'Valor da diária' : 'Valor total da estadia'}
                valor={valorTotal}
                aoMudar={setValorTotal}
                teclado="decimal-pad"
                prefixo="R$"
              />
              {comPlano ? (
                <Text style={s.dica}>
                  Valor cobrado por dia. Numa recorrência, vale para cada
                  ocorrência gerada.
                </Text>
              ) : null}
              {comPlano ? (
                <Seletor
                  rotulo="Forma de pagamento"
                  valor={formaPagamento}
                  opcoes={FORMAS_PAGAMENTO}
                  rotuloDe={(f) => rotuloFormaPagamento[f]}
                  aoSelecionar={setFormaPagamento}
                  permiteVazio
                  textoVazio="Nenhuma"
                />
              ) : null}
            </Secao>

            <Secao titulo="Pertences deixados">
              <LinhaSwitch
                titulo="Caminha"
                valor={temCaminha}
                aoMudar={setTemCaminha}
              />
              {temCaminha ? (
                <Campo
                  rotulo="Cor da caminha"
                  valor={corCaminha}
                  aoMudar={setCorCaminha}
                />
              ) : null}
              <LinhaSwitch titulo="Roupa" valor={temRoupa} aoMudar={setTemRoupa} />
              {temRoupa ? (
                <Campo
                  rotulo="Cor da roupa"
                  valor={corRoupa}
                  aoMudar={setCorRoupa}
                />
              ) : null}
              <LinhaSwitch
                titulo="Brinquedo"
                valor={temBrinquedo}
                aoMudar={setTemBrinquedo}
              />
              {temBrinquedo ? (
                <Campo
                  rotulo="Qual brinquedo"
                  valor={qualBrinquedo}
                  aoMudar={setQualBrinquedo}
                />
              ) : null}
              <Campo rotulo="Ração" valor={racao} aoMudar={setRacao} />
              <View style={s.linha}>
                <View style={s.flex}>
                  <Campo
                    rotulo="Quantidade"
                    valor={quantidade}
                    aoMudar={setQuantidade}
                  />
                </View>
                <View style={s.flex}>
                  <Campo rotulo="Vezes ao dia" valor={vezes} aoMudar={setVezes} />
                </View>
              </View>
              <Campo
                rotulo="Observações dos pertences"
                valor={obsPertences}
                aoMudar={setObsPertences}
                multilinha
              />
            </Secao>
          </>
        ) : null}

        {/*
          Banho tem secao propria em vez de entrar no bloco `comEstadia`:
          registra valor, mas nao pertences. Forma de pagamento ficou de fora
          — se um dia fizer sentido, e trocar a condicao dela por `eBanho`,
          nao `comPlano` (que so vale para Creche).
        */}
        {eBanho ? (
          <Secao titulo="Valor">
            <Campo
              rotulo="Valor do(s) banho(s)"
              valor={valorTotal}
              aoMudar={setValorTotal}
              teclado="decimal-pad"
              prefixo="R$"
            />
          </Secao>
        ) : null}

        <Secao titulo="Observações">
          <Campo
            rotulo="Observações gerais"
            valor={observacoes}
            aoMudar={setObservacoes}
            multilinha
          />
        </Secao>

        {editando && status !== 'cancelado' ? (
          <Pressable style={s.cancelar} onPress={confirmarCancelamento}>
            <Text style={s.cancelarTexto}>Cancelar este dia</Text>
          </Pressable>
        ) : null}

        {editando && consulta.data?.agendamentoRecorrenciaId ? (
          <Pressable
            style={[s.cancelar, s.cancelarSerie]}
            onPress={() =>
              confirmarCancelamentoSerie(
                consulta.data!.agendamentoRecorrenciaId!,
              )
            }
          >
            <Text style={s.cancelarTexto}>Cancelar série inteira</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={s.rodape}>
        <Pressable
          style={[estilos.botaoPrimario, salvando && estilos.desabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={cores.branco} />
          ) : (
            <Text style={estilos.botaoPrimarioTexto}>
              {editando ? 'Salvar alterações' : 'Criar'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * As demais ocorrencias da mesma serie recorrente.
 *
 * A lista principal colapsa a serie em um cartao so; e aqui que a equipe ve
 * os dias de fato. Passadas ficam esmaecidas e canceladas riscadas, para o
 * historico continuar visivel sem competir com o que ainda vai acontecer.
 */
function SecaoSerie({
  recorrenciaId,
  atualId,
}: {
  recorrenciaId: string;
  atualId: string;
}) {
  const router = useRouter();
  const { data, isPending } = useOcorrenciasSerie(recorrenciaId);

  if (isPending) {
    return (
      <Secao titulo="Ocorrências da série">
        <ActivityIndicator color={cores.primaria} />
      </Secao>
    );
  }

  const ocorrencias = data ?? [];
  const agora = Date.now();
  const restantes = ocorrencias.filter(
    (o) => o.status !== 'cancelado' && o.dataHoraInicio.getTime() >= agora,
  ).length;

  return (
    <Secao titulo={`Ocorrências da série (${ocorrencias.length})`}>
      <Text style={s.dica}>
        {restantes > 0
          ? `${restantes} ainda por vir. Toque para abrir.`
          : 'Nenhuma ocorrência futura nesta série.'}
      </Text>
      {ocorrencias.map((o) => {
        const cancelada = o.status === 'cancelado';
        const passada = o.dataHoraInicio.getTime() < agora;
        const atual = o.id === atualId;
        return (
          <Pressable
            key={o.id}
            disabled={atual}
            onPress={() => router.push(`/estadias/agendamento/${o.id}`)}
            style={[s.ocorrencia, atual && s.ocorrenciaAtual]}
          >
            <Text
              style={[
                s.ocorrenciaData,
                passada && !cancelada && s.ocorrenciaPassada,
                cancelada && s.ocorrenciaCancelada,
              ]}
            >
              {formatarData(o.dataHoraInicio)} · {formatarHora(o.dataHoraInicio)}
              {o.dataHoraFim ? ` – ${formatarHora(o.dataHoraFim)}` : ''}
            </Text>
            {atual ? (
              <Text style={s.etiquetaAtual}>esta</Text>
            ) : cancelada ? (
              <Text style={s.etiquetaCancelada}>cancelada</Text>
            ) : null}
          </Pressable>
        );
      })}
    </Secao>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xxl },
  flex: { flex: 1 },
  linha: { flexDirection: 'row', gap: espaco.md },
  dica: { fontSize: 12, color: cores.textoSuave },
  ocorrencia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.sm,
    borderRadius: raio.md,
    gap: espaco.sm,
  },
  ocorrenciaAtual: { backgroundColor: cores.neutraTenue },
  ocorrenciaData: { fontSize: 14, color: cores.textoEscuro },
  ocorrenciaPassada: { color: cores.textoSuave },
  ocorrenciaCancelada: {
    color: cores.textoSuave,
    textDecorationLine: 'line-through',
  },
  etiquetaAtual: { fontSize: 11, fontWeight: '700', color: cores.primaria },
  etiquetaCancelada: { fontSize: 11, color: cores.textoSuave },
  cancelarSerie: { marginTop: espaco.sm },
  caes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  cao: {
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.md,
    borderRadius: raio.pill,
    borderWidth: 1,
    borderColor: cores.neutra,
    backgroundColor: cores.branco,
  },
  caoAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  caoTexto: { fontSize: 14, color: cores.textoEscuro },
  caoTextoAtivo: { color: cores.branco, fontWeight: '700' },
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  dia: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.pill,
    backgroundColor: cores.neutraClara,
  },
  diaAtivo: { backgroundColor: cores.primaria },
  diaTexto: { fontSize: 13, color: cores.textoEscuro },
  diaTextoAtivo: { color: cores.branco, fontWeight: '700' },
  previsao: {
    marginTop: espaco.md,
    fontSize: 13,
    color: cores.primaria,
    fontWeight: '600',
  },
  cancelar: {
    borderWidth: 1,
    borderColor: cores.erro,
    borderRadius: raio.md,
    paddingVertical: espaco.md,
    alignItems: 'center',
    marginTop: espaco.sm,
  },
  cancelarTexto: { color: cores.erro, fontWeight: '600' },
  rodape: {
    padding: espaco.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cores.neutra,
    backgroundColor: cores.branco,
  },
});
