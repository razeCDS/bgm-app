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
  useCriarAgendamento,
} from '../hooks';
import {
  gerarOcorrencias,
  validarAgendamento,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import {
  abreviadoDiaSemana,
  DIAS_SEMANA,
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
  const criar = useCriarAgendamento();
  const atualizar = useAtualizarAgendamento();
  const cancelar = useCancelarAgendamento();

  // ── Estado do formulario ──
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoAgendamento>('creche');
  const [status, setStatus] = useState<StatusAgendamento>('solicitado');
  const [inicio, setInicio] = useState<Date>(new Date());
  const [fim, setFim] = useState<Date | null>(null);
  const [recorrente, setRecorrente] = useState(false);
  const [dias, setDias] = useState<DiaSemana[]>([]);
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

    setAnimalId(a.animalId);
    setTipo(a.tipo);
    setStatus(a.status);
    setInicio(a.dataHoraInicio);
    setFim(a.dataHoraFim);
    setRecorrente(a.recorrente);
    setDias(a.diasSemanaRecorrencia);
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
    } else if (comEstadia && valorOk) {
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

    return {
      animalId: animalId ?? '',
      tipo,
      dataHoraInicio: inicio,
      dataHoraFim: fim,
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
    recorrente && comRecorrencia && fim && dias.length > 0
      ? gerarOcorrencias(montarEntrada()).length
      : 0;

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <View style={estilos.tela}>
      <ScrollView contentContainerStyle={s.conteudo}>
        <Secao titulo="Dados principais">
          <Seletor
            rotulo="Animal *"
            valor={animalId}
            opcoes={(animais.data ?? []).map((a) => a.id)}
            rotuloDe={(id) => {
              const a = animais.data?.find((x) => x.id === id);
              return a
                ? `${a.nome}${a.tutor ? ` — ${a.tutor.nomeCompleto}` : ''}`
                : id;
            }}
            aoSelecionar={setAnimalId}
          />
          <Seletor
            rotulo="Tipo *"
            valor={tipo}
            opcoes={TIPOS_AGENDAMENTO}
            rotuloDe={(t) => rotuloTipo[t]}
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

        <Secao titulo="Período">
          <SeletorDataHora rotulo="Início *" valor={inicio} aoMudar={setInicio} />
          <SeletorDataHora
            rotulo="Fim"
            valor={fim}
            aoMudar={setFim}
            aoLimpar={() => setFim(null)}
          />
          <Text style={s.dica}>
            A data final é opcional, exceto em agendamentos recorrentes.
          </Text>
        </Secao>

        {comRecorrencia ? (
          <Secao titulo="Recorrência">
            <LinhaSwitch
              titulo="Agendamento recorrente"
              descricao="Gera uma ocorrência por dia marcado dentro do período."
              valor={recorrente}
              aoMudar={setRecorrente}
            />
            {recorrente ? (
              <>
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
                    Serão geradas {previsao} ocorrências.
                  </Text>
                ) : null}
              </>
            ) : null}
          </Secao>
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
                rotulo="Entrada"
                valor={horaEntrada}
                aoMudar={setHoraEntrada}
              />
              <SeletorHora
                rotulo="Saída"
                valor={horaSaida}
                aoMudar={setHoraSaida}
              />
            </View>
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
              <Campo
                rotulo="Valor total da estadia"
                valor={valorTotal}
                aoMudar={setValorTotal}
                teclado="decimal-pad"
                prefixo="R$"
              />
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
            <Text style={s.cancelarTexto}>Cancelar agendamento</Text>
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

const s = StyleSheet.create({
  conteudo: { padding: espaco.lg, paddingBottom: espaco.xxl },
  flex: { flex: 1 },
  linha: { flexDirection: 'row', gap: espaco.md },
  dica: { fontSize: 12, color: cores.textoSuave },
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
