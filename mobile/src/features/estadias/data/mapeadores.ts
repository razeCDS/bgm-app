import { horaCurta } from '../../../lib/formatadores';
import type {
  DiaSemana,
  EspecieAnimal,
  FormaPagamento,
  PorteAnimal,
  SexoAnimal,
  StatusAgendamento,
  TipoAgendamento,
  TipoPlano,
} from '../types/enums';
import type {
  Agendamento,
  Anamnese,
  Animal,
  ContatoEmergencia,
  PertencesDeixados,
  PlanoEstadia,
  TermoConsentimento,
  Tutor,
  VeterinarioInfo,
} from '../types/modelos';

/**
 * Conversao entre as linhas do Postgres (snake_case) e os modelos do app.
 * Os nomes de coluna aqui foram verificados contra o schema real.
 */

type Linha = Record<string, any>;

const data = (v: unknown): Date | null =>
  v == null ? null : new Date(v as string);

/** Colunas `date`: enviadas sem a parte de hora. */
const soData = (d: Date | null): string | null =>
  d ? d.toISOString().slice(0, 10) : null;

/** Colunas `time`: "HH:mm" -> "HH:mm:00". */
const paraHora = (h: string | null): string | null => (h ? `${h}:00` : null);

// ── Tutor ──

export const tutorDeLinha = (l: Linha): Tutor => ({
  id: l.id,
  nomeCompleto: l.nome_completo,
  endereco: l.endereco ?? null,
  rg: l.rg ?? null,
  cpfCnpj: l.cpf_cnpj ?? null,
  telefone: l.telefone ?? null,
  email: l.email ?? null,
});

export const tutorParaLinha = (t: Tutor): Linha => ({
  nome_completo: t.nomeCompleto,
  endereco: t.endereco,
  rg: t.rg,
  cpf_cnpj: t.cpfCnpj,
  telefone: t.telefone,
  email: t.email,
});

// ── Animal ──

export const animalDeLinha = (l: Linha): Animal => ({
  id: l.id,
  tutorId: l.tutor_id,
  nome: l.nome,
  raca: l.raca ?? null,
  // Coluna `text` no banco, tratada como numero no app.
  idade: l.idade == null || l.idade === '' ? null : Number(l.idade),
  porte: (l.porte as PorteAnimal) ?? null,
  peso: l.peso == null ? null : Number(l.peso),
  especie: (l.especie as EspecieAnimal) ?? null,
  sexo: (l.sexo as SexoAnimal) ?? null,
  castrado: l.castrado ?? null,
  docil: l.docil ?? null,
  observacoes: l.observacoes ?? null,
  tutor: l.tutores ? tutorDeLinha(l.tutores) : null,
});

export const animalParaLinha = (a: Animal): Linha => ({
  tutor_id: a.tutorId,
  nome: a.nome,
  raca: a.raca,
  idade: a.idade == null ? null : String(a.idade),
  porte: a.porte,
  peso: a.peso,
  especie: a.especie,
  sexo: a.sexo,
  castrado: a.castrado,
  docil: a.docil,
  observacoes: a.observacoes,
});

// ── Veterinario ──

export const veterinarioDeLinha = (l: Linha): VeterinarioInfo => ({
  id: l.id,
  animalId: l.animal_id,
  nomeVeterinario: l.nome_veterinario ?? null,
  temEspecialidade: l.tem_especialidade ?? null,
  qualEspecialidade: l.qual_especialidade ?? null,
  telefoneVeterinario: l.telefone_veterinario ?? null,
  nomeClinica: l.nome_clinica ?? null,
  telefoneClinica: l.telefone_clinica ?? null,
  enderecoClinica: l.endereco_clinica ?? null,
});

export const veterinarioParaLinha = (v: VeterinarioInfo): Linha => ({
  animal_id: v.animalId,
  nome_veterinario: v.nomeVeterinario,
  tem_especialidade: v.temEspecialidade,
  qual_especialidade: v.qualEspecialidade,
  telefone_veterinario: v.telefoneVeterinario,
  nome_clinica: v.nomeClinica,
  telefone_clinica: v.telefoneClinica,
  endereco_clinica: v.enderecoClinica,
});

// ── Contato de emergencia ──

export const contatoDeLinha = (l: Linha): ContatoEmergencia => ({
  id: l.id,
  animalId: l.animal_id,
  nome: l.nome ?? null,
  parentesco: l.parentesco ?? null,
  telefone: l.telefone ?? null,
  ordem: l.ordem ?? null,
});

export const contatoParaLinha = (c: ContatoEmergencia): Linha => ({
  animal_id: c.animalId,
  nome: c.nome,
  parentesco: c.parentesco,
  telefone: c.telefone,
  ordem: c.ordem,
});

// ── Anamnese ──

export const anamneseDeLinha = (l: Linha): Anamnese => ({
  id: l.id,
  animalId: l.animal_id,
  doencaPreexistente: l.doenca_preexistente ?? null,
  doencaQual: l.doenca_qual ?? null,
  alergias: l.alergias ?? null,
  cuidadosEspeciais: l.cuidados_especiais ?? null,
  cuidadosQual: l.cuidados_qual ?? null,
  tomaMedicacao: l.toma_medicacao ?? null,
  medicacaoQual: l.medicacao_qual ?? null,
  vermifugadoUltimoMes: l.vermifugado_ultimo_mes ?? null,
  dataVermifugo: data(l.data_vermifugo),
  vacinadoEsteAno: l.vacinado_este_ano ?? null,
  dataVacinacao: data(l.data_vacinacao),
  observacoes: l.observacoes ?? null,
});

export const anamneseParaLinha = (a: Anamnese): Linha => ({
  animal_id: a.animalId,
  doenca_preexistente: a.doencaPreexistente,
  doenca_qual: a.doencaQual,
  alergias: a.alergias,
  cuidados_especiais: a.cuidadosEspeciais,
  cuidados_qual: a.cuidadosQual,
  toma_medicacao: a.tomaMedicacao,
  medicacao_qual: a.medicacaoQual,
  vermifugado_ultimo_mes: a.vermifugadoUltimoMes,
  data_vermifugo: soData(a.dataVermifugo),
  vacinado_este_ano: a.vacinadoEsteAno,
  data_vacinacao: soData(a.dataVacinacao),
  observacoes: a.observacoes,
});

// ── Termo ──

export const termoDeLinha = (l: Linha): TermoConsentimento => ({
  id: l.id,
  animalId: l.animal_id,
  aceito: l.aceito ?? null,
  dataAceite: data(l.data_aceite),
  localAceite: l.local_aceite ?? null,
});

export const termoParaLinha = (t: TermoConsentimento): Linha => ({
  animal_id: t.animalId,
  aceito: t.aceito,
  data_aceite: t.dataAceite ? t.dataAceite.toISOString() : null,
  local_aceite: t.localAceite,
});

// ── Plano e pertences ──

export const planoDeLinha = (l: Linha): PlanoEstadia => ({
  id: l.id,
  agendamentoId: l.agendamento_id,
  tipoPlano: (l.tipo_plano as TipoPlano) ?? null,
  totalDias: l.total_dias ?? null,
  horarioEntrada: horaCurta(l.horario_entrada),
  horarioSaida: horaCurta(l.horario_saida),
  formaPagamento: (l.forma_pagamento as FormaPagamento) ?? null,
  valorTotal: l.valor_total == null ? null : Number(l.valor_total),
});

export const planoParaLinha = (p: PlanoEstadia): Linha => ({
  tipo_plano: p.tipoPlano,
  total_dias: p.totalDias,
  horario_entrada: paraHora(p.horarioEntrada),
  horario_saida: paraHora(p.horarioSaida),
  forma_pagamento: p.formaPagamento,
  valor_total: p.valorTotal,
});

export const pertencesDeLinha = (l: Linha): PertencesDeixados => ({
  id: l.id,
  agendamentoId: l.agendamento_id,
  temCaminha: l.tem_caminha ?? null,
  corCaminha: l.cor_caminha ?? null,
  temRoupa: l.tem_roupa ?? null,
  corRoupa: l.cor_roupa ?? null,
  temBrinquedo: l.tem_brinquedo ?? null,
  qualBrinquedo: l.qual_brinquedo ?? null,
  racao: l.racao ?? null,
  quantidade: l.quantidade ?? null,
  vezes: l.vezes ?? null,
  observacoes: l.observacoes ?? null,
});

export const pertencesParaLinha = (p: PertencesDeixados): Linha => ({
  tem_caminha: p.temCaminha,
  cor_caminha: p.corCaminha,
  tem_roupa: p.temRoupa,
  cor_roupa: p.corRoupa,
  tem_brinquedo: p.temBrinquedo,
  qual_brinquedo: p.qualBrinquedo,
  racao: p.racao,
  quantidade: p.quantidade,
  vezes: p.vezes,
  observacoes: p.observacoes,
});

// ── Agendamento ──

/** Embeds 1:1 podem chegar como objeto ou como lista de um item. */
const umDe = (bruto: unknown): Linha | null => {
  if (Array.isArray(bruto)) return (bruto[0] as Linha) ?? null;
  return (bruto as Linha) ?? null;
};

export const agendamentoDeLinha = (l: Linha): Agendamento => {
  const plano = umDe(l.planos_estadia);
  const pertences = umDe(l.pertences_deixados);
  // Vem do embed de `agendamento_animais`, que traz cada animal aninhado.
  const vinculos = (l.agendamento_animais ?? []) as any[];
  const animais = vinculos
    .map((v) => (v?.animais ? animalDeLinha(v.animais) : null))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return {
    id: l.id,
    animalIds: vinculos.map((v) => v.animal_id as string),
    tipo: l.tipo as TipoAgendamento,
    dataHoraInicio: new Date(l.data_hora_inicio),
    dataHoraFim: data(l.data_hora_fim),
    status: l.status as StatusAgendamento,
    recorrente: l.recorrente ?? false,
    diasSemanaRecorrencia: (l.dias_semana_recorrencia ?? []) as DiaSemana[],
    agendamentoRecorrenciaId: l.agendamento_recorrencia_id ?? null,
    observacoes: l.observacoes ?? null,
    googleCalendarEventId: l.google_calendar_event_id ?? null,
    googleSyncErro: l.google_sync_erro ?? null,
    animais,
    planoEstadia: plano ? planoDeLinha(plano) : null,
    pertencesDeixados: pertences ? pertencesDeLinha(pertences) : null,
  };
};
