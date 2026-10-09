'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Botao } from '../../../components/botoes';
import { iconeServico } from '../../../components/chips';
import {
  Campo,
  Dica,
  LinhaCheckbox,
  LinhaSwitch,
  Pilula,
  Rodape,
  Secao,
  Seletor,
  SeletorDataHora,
  SeletorHora,
} from '../../../components/campos';
import { useDialogo } from '../../../components/dialogo';
import { Carregando, EstadoErro } from '../../../components/estados';
import { Spinner } from '../../../components/spinner';
import { mensagemDeErro } from '../../../lib/erros';
import { formatarData, formatarHora, formatarMoeda } from '../../../lib/formatadores';
import { useVoltar } from '../../../lib/navegacao';
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
import {
  comHorario,
  diasDaEstadia,
  fimDaJanela,
  gerarOcorrencias,
  validarAgendamento,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import {
  abreviadoDiaSemana,
  DIAS_SEMANA,
  diaSemanaDe,
  ePrincipal,
  exigePlanoEstadia,
  FORMAS_PAGAMENTO,
  permiteDiaEspecifico,
  permiteRecorrencia,
  rotuloFormaPagamento,
  rotuloServico,
  rotuloServicoCompleto,
  rotuloStatus,
  rotuloTipoPlano,
  SERVICOS,
  SERVICOS_EXTRAS,
  servicoIncompativel,
  servicoTemValor,
  STATUS_AGENDAMENTO,
  temPertences,
  TIPOS_PLANO,
  type DiaSemana,
  type FormaPagamento,
  type ServicoAgendamento,
  type StatusAgendamento,
  type TipoPlano,
} from '../types/enums';
import {
  chaveServico,
  ordenarServicos,
  valorEPorDia,
  valorTotalDe,
  type Agendamento,
  type ServicoContratado,
} from '../types/modelos';

/**
 * Criacao e edicao de agendamento.
 *
 * Secoes condicionais, decididas pela COMBINACAO de servicos marcados:
 *  - Data (sem horario) + Plano de estadia + Recorrencia: com Creche
 *  - Periodo (inicio e fim): sem Creche
 *  - Dias da hospedagem (extras num dia especifico): com Hotel
 *  - Pertences: com Creche ou Hotel
 *  - Valores: um campo por servico (e por dia), menos Visita
 */
export function FormAgendamento({ agendamentoId }: { agendamentoId?: string }) {
  const consulta = useAgendamento(agendamentoId);

  if (agendamentoId && consulta.isPending) return <Carregando />;
  if (agendamentoId && consulta.error) {
    return <EstadoErro mensagem={mensagemDeErro(consulta.error)} />;
  }
  return <Formulario agendamentoId={agendamentoId} original={consulta.data} />;
}

/**
 * Valor inicial de cada campo: o do agendamento salvo (edicao) ou o padrao
 * (criacao).
 *
 * O `Formulario` so monta DEPOIS que o agendamento carregou, entao estes
 * valores entram direto no `useState` — sem o `useEffect` que o mobile usava
 * para preencher os campos quando a resposta chegava. De quebra, um refetch
 * em segundo plano nao apaga o que ja foi digitado: o `useState` so le o
 * valor inicial uma vez.
 */
function valoresIniciais(a: Agendamento | undefined) {
  const p = a?.planoEstadia;
  const d = a?.pertencesDeixados;
  return {
    // O tutor nao e guardado no agendamento: deduzimos pelo primeiro cao.
    tutorId: a?.animais?.[0]?.tutorId ?? null,
    animalIds: a?.animalIds ?? [],
    // Os checkboxes marcam o servico SEM dia; os extras com dia (Hotel) tem
    // estado proprio, editado na secao "Dias da hospedagem".
    servicos: [
      ...new Set((a?.servicos ?? []).filter((s) => !s.data).map((s) => s.servico)),
    ],
    extrasPorDia: (a?.servicos ?? [])
      .filter((s) => s.data)
      .map((s) => ({ servico: s.servico, data: s.data! })),
    // Texto de cada campo de valor, por servico + dia (`chaveServico`).
    valores: Object.fromEntries(
      (a?.servicos ?? []).map((s) => [chaveServico(s), s.valor != null ? String(s.valor) : '']),
    ) as Record<string, string>,
    status: a?.status ?? ('solicitado' as StatusAgendamento),
    inicio: a?.dataHoraInicio ?? new Date(),
    fim: a?.dataHoraFim ?? null,
    recorrente: a?.recorrente ?? false,
    dias: a?.diasSemanaRecorrencia ?? ([] as DiaSemana[]),
    semanas:
      a?.recorrente && a.dataHoraFim
        ? semanasDaJanela(a.dataHoraInicio, a.dataHoraFim)
        : '4',
    observacoes: a?.observacoes ?? '',

    tipoPlano: p?.tipoPlano ?? null,
    totalDias: p?.totalDias != null ? String(p.totalDias) : '',
    horaEntrada: p?.horarioEntrada ?? null,
    horaSaida: p?.horarioSaida ?? null,
    formaPagamento: p?.formaPagamento ?? null,

    temCaminha: d?.temCaminha ?? false,
    corCaminha: d?.corCaminha ?? '',
    temRoupa: d?.temRoupa ?? false,
    corRoupa: d?.corRoupa ?? '',
    temBrinquedo: d?.temBrinquedo ?? false,
    qualBrinquedo: d?.qualBrinquedo ?? '',
    racao: d?.racao ?? '',
    quantidade: d?.quantidade ?? '',
    vezes: d?.vezes ?? '',
    obsPertences: d?.observacoes ?? '',
  };
}

/**
 * A duracao nao e persistida: as ocorrencias sao a verdade. Ao editar,
 * reconstruimos as semanas a partir da janela original.
 */
function semanasDaJanela(inicio: Date, fim: Date): string {
  const dia = 86_400_000;
  const dias = Math.round(
    (new Date(fim).setHours(0, 0, 0, 0) - new Date(inicio).setHours(0, 0, 0, 0)) / dia,
  );
  return String(Math.max(1, Math.ceil((dias + 1) / 7)));
}

function Formulario({
  agendamentoId,
  original,
}: {
  agendamentoId?: string;
  original?: Agendamento;
}) {
  const voltar = useVoltar('/estadias/agendamentos');
  const { avisar, confirmar } = useDialogo();
  const editando = !!agendamentoId;

  const animais = useAnimais();
  const tutores = useTutores();
  const criar = useCriarAgendamento();
  const atualizar = useAtualizarAgendamento();
  const cancelar = useCancelarAgendamento();
  const cancelarSerie = useCancelarSerie();

  // ── Estado do formulario ──
  const [ini] = useState(() => valoresIniciais(original));
  const [tutorId, setTutorId] = useState<string | null>(ini.tutorId);
  const [animalIds, setAnimalIds] = useState<string[]>(ini.animalIds);
  const [servicos, setServicos] = useState<ServicoAgendamento[]>(ini.servicos);
  const [extrasPorDia, setExtrasPorDia] = useState<ExtraNoDia[]>(ini.extrasPorDia);
  const [valores, setValores] = useState(ini.valores);
  const [status, setStatus] = useState<StatusAgendamento>(ini.status);
  const [inicio, setInicio] = useState<Date>(ini.inicio);
  const [fim, setFim] = useState<Date | null>(ini.fim);
  const [recorrente, setRecorrente] = useState(ini.recorrente);
  const [dias, setDias] = useState<DiaSemana[]>(ini.dias);
  // Creche recorrente: a janela e informada em semanas, nao com data final.
  const [semanas, setSemanas] = useState(ini.semanas);
  const [observacoes, setObservacoes] = useState(ini.observacoes);

  // Plano (creche)
  const [tipoPlano, setTipoPlano] = useState<TipoPlano | null>(ini.tipoPlano);
  const [totalDias, setTotalDias] = useState(ini.totalDias);
  const [horaEntrada, setHoraEntrada] = useState<string | null>(ini.horaEntrada);
  const [horaSaida, setHoraSaida] = useState<string | null>(ini.horaSaida);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(
    ini.formaPagamento,
  );

  // Pertences
  const [temCaminha, setTemCaminha] = useState(ini.temCaminha);
  const [corCaminha, setCorCaminha] = useState(ini.corCaminha);
  const [temRoupa, setTemRoupa] = useState(ini.temRoupa);
  const [corRoupa, setCorRoupa] = useState(ini.corRoupa);
  const [temBrinquedo, setTemBrinquedo] = useState(ini.temBrinquedo);
  const [qualBrinquedo, setQualBrinquedo] = useState(ini.qualBrinquedo);
  const [racao, setRacao] = useState(ini.racao);
  const [quantidade, setQuantidade] = useState(ini.quantidade);
  const [vezes, setVezes] = useState(ini.vezes);
  const [obsPertences, setObsPertences] = useState(ini.obsPertences);

  const comPlano = exigePlanoEstadia(servicos);
  const comPertences = temPertences(servicos);
  const comRecorrencia = permiteRecorrencia(servicos);
  const comDias = permiteDiaEspecifico(servicos);

  // Tudo o que foi contratado: os marcados sem dia e os extras por dia.
  const contratados = ordenarServicos([
    ...servicos.map((s) => ({ servico: s, data: null as Date | null })),
    ...extrasPorDia,
  ]);
  // Para as regras de combinacao, o que conta e o servico, nao o dia.
  const todosServicos = [...new Set(contratados.map((c) => c.servico))];
  const comValor = contratados.filter((c) => servicoTemValor(c.servico));
  const diasHospedagem = comDias ? diasDaEstadia(inicio, fim) : [];

  const caesDoTutor = (animais.data ?? []).filter((a) => a.tutorId === tutorId);

  const numeroSemanas = Number(semanas);
  const semanasOk = Number.isInteger(numeroSemanas) && numeroSemanas > 0;

  /**
   * Marca/desmarca mantendo a ordem de `SERVICOS`, para a lista sair igual
   * no banco, nos chips e no titulo do Google, seja qual for a ordem dos
   * toques.
   */
  function alternarServico(servico: ServicoAgendamento, marcar: boolean) {
    const novos = SERVICOS.filter((s) =>
      s === servico ? marcar : servicos.includes(s),
    );
    setServicos(novos);
    if (!permiteRecorrencia(novos)) {
      setRecorrente(false);
      setDias([]);
    }
    // Sem Hotel nao ha dias de hospedagem (so acontece na criacao: na
    // edicao o Hotel e travado).
    if (!permiteDiaEspecifico(novos)) setExtrasPorDia([]);
  }

  function alternarExtraNoDia(servico: ServicoAgendamento, dia: Date) {
    const mesmo = (x: ExtraNoDia) =>
      x.servico === servico && x.data.getTime() === dia.getTime();
    setExtrasPorDia(
      extrasPorDia.some(mesmo)
        ? extrasPorDia.filter((x) => !mesmo(x))
        : [...extrasPorDia, { servico, data: dia }],
    );
  }

  function montarEntrada(): EntradaAgendamento {
    // Valor livre: vazio ou ilegivel vira "nao informado", e nao zero.
    const lerValor = (texto: string | undefined) => {
      const v = Number((texto ?? '').replace(',', '.'));
      return texto?.trim() && !Number.isNaN(v) ? v : null;
    };
    const servicosEntrada: ServicoContratado[] = contratados.map((c) => ({
      servico: c.servico,
      data: c.data,
      valor: servicoTemValor(c.servico) ? lerValor(valores[chaveServico(c)]) : null,
    }));

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
      servicos: servicosEntrada,
      dataHoraInicio: dataInicio,
      dataHoraFim: dataFim,
      status,
      recorrente: recorrente && comRecorrencia,
      diasSemanaRecorrencia: comRecorrencia ? dias : [],
      observacoes: observacoes.trim() || null,
      planoEstadia: plano,
      pertencesDeixados: comPertences
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
      return avisar(
        'Verifique os dados',
        'Informe a duração da recorrência em semanas (número inteiro maior que zero).',
      );
    }

    const entrada = montarEntrada();
    const erro = validarAgendamento(entrada);
    if (erro) return avisar('Verifique os dados', erro);

    try {
      if (editando) {
        await atualizar.mutateAsync({ id: agendamentoId!, entrada });
      } else {
        const criados = await criar.mutateAsync(entrada);
        // Sem `await`: o aviso fica por cima da lista, para onde voltamos.
        if (criados.length > 1) void avisar('Pronto', `${criados.length} ocorrências criadas.`);
      }
      voltar();
    } catch (e) {
      await avisar('Não foi possível salvar', mensagemDeErro(e));
    }
  }

  /**
   * Cancela o restante da serie. O corte e "agora": ocorrencias que ja
   * comecaram permanecem, porque sao registro de frequencia — o cao esteve
   * la, e marca-las como canceladas falsearia o historico e a cobranca.
   */
  async function confirmarCancelamentoSerie(recorrenciaId: string) {
    const agora = new Date();
    const ok = await confirmar({
      titulo: 'Cancelar série inteira',
      mensagem:
        'Todas as ocorrências futuras desta série serão canceladas. ' +
        'As que já aconteceram são mantidas.',
      textoConfirmar: 'Cancelar série',
      destrutivo: true,
    });
    if (!ok) return;

    try {
      const canceladas = await cancelarSerie.mutateAsync({ recorrenciaId, aPartirDe: agora });
      if (canceladas.length === 0) {
        await avisar('Nada a cancelar', 'Esta série não tem ocorrências futuras.');
        return;
      }
      void avisar(
        'Pronto',
        `${canceladas.length} ocorrência${
          canceladas.length > 1 ? 's canceladas' : ' cancelada'
        }.`,
      );
      voltar();
    } catch (e) {
      await avisar('Não foi possível cancelar a série', mensagemDeErro(e));
    }
  }

  async function confirmarCancelamento() {
    const ok = await confirmar({
      titulo: 'Cancelar agendamento',
      mensagem: 'O agendamento será marcado como Cancelado. O registro não é apagado.',
      textoConfirmar: 'Cancelar agendamento',
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await cancelar.mutateAsync(agendamentoId!);
      voltar();
    } catch (e) {
      await avisar('Não foi possível cancelar', mensagemDeErro(e));
    }
  }

  const previsao =
    recorrente && comRecorrencia && semanasOk && dias.length > 0
      ? gerarOcorrencias(montarEntrada()).length
      : 0;

  const salvando = criar.isPending || atualizar.isPending;
  const recorrenciaId = original?.agendamentoRecorrenciaId ?? null;

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-6">
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
            rotuloDe={(id) => tutores.data?.find((t) => t.id === id)?.nomeCompleto ?? id}
            aoSelecionar={(id) => {
              setTutorId(id);
              // Trocar de tutor invalida a selecao anterior de caes.
              if (id !== tutorId) setAnimalIds([]);
            }}
          />

          <fieldset className="mb-3.5">
            <legend className="mb-1.5 text-xs text-texto-suave">Cães *</legend>
            {!tutorId ? (
              <Dica>Selecione o tutor para listar os cães.</Dica>
            ) : caesDoTutor.length === 0 ? (
              <Dica>Este tutor não possui cães cadastrados.</Dica>
            ) : (
              <div className="flex flex-wrap gap-2">
                {caesDoTutor.map((c) => {
                  const marcado = animalIds.includes(c.id);
                  return (
                    <Pilula
                      key={c.id}
                      ativo={marcado}
                      aoTocar={() =>
                        setAnimalIds(
                          marcado
                            ? animalIds.filter((x) => x !== c.id)
                            : [...animalIds, c.id],
                        )
                      }
                    >
                      {marcado ? '✓ ' : ''}
                      {c.nome}
                    </Pilula>
                  );
                })}
              </div>
            )}
          </fieldset>

          <Seletor
            rotulo="Status"
            valor={status}
            opcoes={STATUS_AGENDAMENTO}
            rotuloDe={(v) => rotuloStatus[v]}
            aoSelecionar={(v) => v && setStatus(v)}
          />
        </Secao>

        <Secao titulo="Serviços *">
          {SERVICOS.map((s) => (
            <LinhaCheckbox
              key={s}
              titulo={rotuloServicoCompleto[s]}
              valor={servicos.includes(s)}
              aoMudar={(marcar) => alternarServico(s, marcar)}
              // Principais definem a estrutura do agendamento (horario,
              // plano, pertences, serie): trocar depois invalidaria tudo
              // isso. Extras continuam livres na edicao.
              bloqueado={editando && ePrincipal(s)}
              desabilitado={servicoIncompativel(s, todosServicos)}
            />
          ))}
          <Dica>
            {editando
              ? 'Creche, Hotel e Visita não podem ser alterados. Para trocar, cancele este agendamento e crie outro.'
              : 'Creche e Hotel não se combinam; Visita é sempre sozinha.'}
          </Dica>
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
            <Dica>Os horários de entrada e saída são definidos no plano de estadia.</Dica>
          </Secao>
        ) : (
          <Secao titulo="Período">
            <SeletorDataHora rotulo="Início *" valor={inicio} aoMudar={setInicio} />
            <SeletorDataHora
              rotulo="Fim"
              valor={fim}
              aoMudar={setFim}
              aoLimpar={() => setFim(null)}
            />
            <Dica>A data final é opcional.</Dica>
          </Secao>
        )}

        {comDias ? (
          <Secao titulo="Dias da hospedagem">
            <div className="mb-2">
              <Dica>
                Toque num serviço para marcá-lo num dia específico. Os marcados em
                Serviços valem para a estadia toda.
              </Dica>
            </div>
            <ul>
              {diasHospedagem.map((d) => (
                <li
                  key={d.getTime()}
                  className="flex flex-wrap items-center gap-2 border-b border-neutra/40 py-2 last:border-b-0"
                >
                  <span className="w-20 shrink-0 text-sm text-texto-escuro">
                    {abreviadoDiaSemana[diaSemanaDe(d)]} {formatarData(d).slice(0, 5)}
                  </span>
                  {SERVICOS_EXTRAS.map((s) => (
                    <Pilula
                      key={s}
                      ativo={extrasPorDia.some(
                        (x) => x.servico === s && x.data.getTime() === d.getTime(),
                      )}
                      aoTocar={() => alternarExtraNoDia(s, d)}
                    >
                      {iconeServico[s]} {rotuloServico[s]}
                    </Pilula>
                  ))}
                </li>
              ))}
            </ul>
          </Secao>
        ) : null}

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
                  teclado="numerico"
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Dias da semana">
                  {DIAS_SEMANA.map((d) => {
                    const ativo = dias.includes(d);
                    return (
                      <Pilula
                        key={d}
                        ativo={ativo}
                        aoTocar={() =>
                          setDias(ativo ? dias.filter((x) => x !== d) : [...dias, d])
                        }
                      >
                        {abreviadoDiaSemana[d]}
                      </Pilula>
                    );
                  })}
                </div>
                {previsao > 0 ? (
                  <p className="mt-3 text-[13px] font-semibold text-primaria">
                    Serão geradas {previsao} ocorrências, até{' '}
                    {formatarData(fimDaJanela(inicio, numeroSemanas))}.
                  </p>
                ) : null}
              </>
            ) : null}
          </Secao>
        ) : null}

        {recorrenciaId ? (
          <SecaoSerie recorrenciaId={recorrenciaId} atualId={agendamentoId!} />
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
            <div className="flex gap-3">
              <SeletorHora rotulo="Entrada *" valor={horaEntrada} aoMudar={setHoraEntrada} />
              <SeletorHora rotulo="Saída *" valor={horaSaida} aoMudar={setHoraSaida} />
            </div>
            <div className="mb-3.5">
              <Dica>
                Definem o horário de cada dia da creche — inclusive das ocorrências de uma
                recorrência.
              </Dica>
            </div>
            <Campo
              rotulo="Total de dias"
              valor={totalDias}
              aoMudar={setTotalDias}
              teclado="numerico"
            />
          </Secao>
        ) : null}

        {comValor.length > 0 ? (
          <Secao titulo="Valores">
            {/*
              Um campo por servico, livre e opcional — nao ha tabela de
              precos. Com Creche os valores sao POR DIA: cada ocorrencia da
              serie tem sua propria copia dos servicos, entao um valor de
              pacote aqui seria replicado em todas e qualquer soma daria o
              total multiplicado pelo numero de dias.
            */}
            {comValor.map((c) => {
              const chave = chaveServico(c);
              return (
                <Campo
                  key={chave}
                  rotulo={rotuloValor(c, comDias)}
                  valor={valores[chave] ?? ''}
                  aoMudar={(v) => setValores({ ...valores, [chave]: v })}
                  teclado="decimal"
                  prefixo="R$"
                />
              );
            })}
            {comValor.length > 1 ? <TotalValores servicos={montarEntrada().servicos} /> : null}
            {comPlano ? (
              <>
                <div className="mb-3.5 -mt-2">
                  <Dica>
                    Valores cobrados por dia. Numa recorrência, valem para cada ocorrência
                    gerada.
                  </Dica>
                </div>
                <Seletor
                  rotulo="Forma de pagamento"
                  valor={formaPagamento}
                  opcoes={FORMAS_PAGAMENTO}
                  rotuloDe={(f) => rotuloFormaPagamento[f]}
                  aoSelecionar={setFormaPagamento}
                  permiteVazio
                  textoVazio="Nenhuma"
                />
              </>
            ) : null}
          </Secao>
        ) : null}

        {comPertences ? (
          <Secao titulo="Pertences deixados">
            <LinhaSwitch titulo="Caminha" valor={temCaminha} aoMudar={setTemCaminha} />
            {temCaminha ? (
              <Campo rotulo="Cor da caminha" valor={corCaminha} aoMudar={setCorCaminha} />
            ) : null}
            <LinhaSwitch titulo="Roupa" valor={temRoupa} aoMudar={setTemRoupa} />
            {temRoupa ? (
              <Campo rotulo="Cor da roupa" valor={corRoupa} aoMudar={setCorRoupa} />
            ) : null}
            <LinhaSwitch titulo="Brinquedo" valor={temBrinquedo} aoMudar={setTemBrinquedo} />
            {temBrinquedo ? (
              <Campo
                rotulo="Qual brinquedo"
                valor={qualBrinquedo}
                aoMudar={setQualBrinquedo}
              />
            ) : null}
            <Campo rotulo="Ração" valor={racao} aoMudar={setRacao} />
            <div className="flex gap-3">
              <div className="flex-1">
                <Campo rotulo="Quantidade" valor={quantidade} aoMudar={setQuantidade} />
              </div>
              <div className="flex-1">
                <Campo rotulo="Vezes ao dia" valor={vezes} aoMudar={setVezes} />
              </div>
            </div>
            <Campo
              rotulo="Observações dos pertences"
              valor={obsPertences}
              aoMudar={setObsPertences}
              multilinha
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
          <Botao
            variante="perigo"
            className="mt-2 w-full"
            carregando={cancelar.isPending}
            onClick={() => void confirmarCancelamento()}
          >
            Cancelar este dia
          </Botao>
        ) : null}

        {recorrenciaId ? (
          <Botao
            variante="perigo"
            className="mt-2 w-full"
            carregando={cancelarSerie.isPending}
            onClick={() => void confirmarCancelamentoSerie(recorrenciaId)}
          >
            Cancelar série inteira
          </Botao>
        ) : null}
      </main>

      <Rodape>
        <Botao className="w-full" carregando={salvando} onClick={() => void salvar()}>
          {editando ? 'Salvar alterações' : 'Criar'}
        </Botao>
      </Rodape>
    </>
  );
}

/** Extra marcado num dia especifico da hospedagem. */
interface ExtraNoDia {
  servico: ServicoAgendamento;
  data: Date;
}

/** Rotulo do campo de valor: diz a que o numero se refere. */
function rotuloValor(
  c: { servico: ServicoAgendamento; data: Date | null },
  hospedagem: boolean,
): string {
  if (c.data) return `${rotuloServico[c.servico]} — ${formatarData(c.data).slice(0, 5)}`;
  if (c.servico === 'creche') return 'Creche (diária)';
  if (c.servico === 'hotel') return 'Hotel (estadia completa)';
  // No Hotel, separa do mesmo extra marcado num dia especifico.
  return hospedagem ? `${rotuloServico[c.servico]} (durante a estadia)` : rotuloServico[c.servico];
}

/** Soma dos valores, quando ha mais de um servico com valor. */
function TotalValores({ servicos }: { servicos: ServicoContratado[] }) {
  const total = valorTotalDe(servicos);
  if (total == null) return null;
  return (
    <p className="mb-3.5 -mt-1 text-right text-[13px] font-semibold text-primaria-escura">
      Total: {formatarMoeda(total)}
      {valorEPorDia(servicos) ? ' por dia' : ''}
    </p>
  );
}

/**
 * As demais ocorrencias da mesma serie recorrente.
 *
 * A lista principal colapsa a serie em um cartao so; e aqui que a equipe ve
 * os dias de fato. Passadas ficam esmaecidas e canceladas riscadas, para o
 * historico continuar visivel sem competir com o que ainda vai acontecer.
 */
function SecaoSerie({ recorrenciaId, atualId }: { recorrenciaId: string; atualId: string }) {
  const { data, isPending } = useOcorrenciasSerie(recorrenciaId);
  // "Agora" congelado na montagem: ler o relogio a cada render faria a
  // mesma lista mudar de classificacao (passada/futura) sem motivo.
  const [agora] = useState(() => Date.now());

  if (isPending) {
    return (
      <Secao titulo="Ocorrências da série">
        <Spinner />
      </Secao>
    );
  }

  const ocorrencias = data ?? [];
  const restantes = ocorrencias.filter(
    (o) => o.status !== 'cancelado' && o.dataHoraInicio.getTime() >= agora,
  ).length;

  return (
    <Secao titulo={`Ocorrências da série (${ocorrencias.length})`}>
      <div className="mb-1">
        <Dica>
          {restantes > 0
            ? `${restantes} ainda por vir. Toque para abrir.`
            : 'Nenhuma ocorrência futura nesta série.'}
        </Dica>
      </div>
      <ul>
        {ocorrencias.map((o) => {
          const cancelada = o.status === 'cancelado';
          const passada = o.dataHoraInicio.getTime() < agora;
          const atual = o.id === atualId;

          const texto = (
            <>
              <span
                className={`text-sm ${
                  cancelada
                    ? 'text-texto-suave line-through'
                    : passada
                      ? 'text-texto-suave'
                      : 'text-texto-escuro'
                }`}
              >
                {formatarData(o.dataHoraInicio)} · {formatarHora(o.dataHoraInicio)}
                {o.dataHoraFim ? ` – ${formatarHora(o.dataHoraFim)}` : ''}
              </span>
              {atual ? (
                <span className="text-[11px] font-bold text-primaria">esta</span>
              ) : cancelada ? (
                <span className="text-[11px] text-texto-suave">cancelada</span>
              ) : null}
            </>
          );
          const classes =
            'flex items-center justify-between gap-2 rounded-campo px-2 py-2';

          return (
            <li key={o.id}>
              {atual ? (
                <div className={`${classes} bg-neutra/35`} aria-current="page">
                  {texto}
                </div>
              ) : (
                <Link
                  href={`/estadias/agendamento/${o.id}`}
                  className={`${classes} hover:bg-neutra-clara`}
                >
                  {texto}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
