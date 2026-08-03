import { exigirSupabase } from '../../../lib/supabase';
import {
  ERRO_SOBREPOSICAO,
  ErroValidacao,
  garantirValido,
  geraRecorrencia,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import type {
  Agendamento,
  Animal,
  FichaAnimal,
  FiltroAgendamentos,
  Tutor,
} from '../types/modelos';
import {
  agendamentoDeLinha,
  anamneseDeLinha,
  anamneseParaLinha,
  animalDeLinha,
  animalParaLinha,
  contatoDeLinha,
  contatoParaLinha,
  pertencesParaLinha,
  planoParaLinha,
  termoDeLinha,
  termoParaLinha,
  tutorDeLinha,
  tutorParaLinha,
  veterinarioDeLinha,
  veterinarioParaLinha,
} from './mapeadores';
import type { EstadiasRepositorio } from './repositorio';

/**
 * Implementacao sobre o Supabase (PostgREST).
 *
 * Escrita contra o schema real ja verificado no projeto. Depende dos scripts
 * em `supabase/`:
 *   - `01_rls_policies.sql`      — RLS liberando `authenticated`
 *   - `02_fn_gerar_ocorrencias.sql` — RPC de recorrencia
 */
/**
 * Traduz violacoes de constraint do Postgres em mensagens que fazem sentido
 * para a equipe da creche.
 *
 * As regras vivem no banco (ver `supabase/04_regras_negocio.sql`) justamente
 * para valerem em qualquer caminho de escrita. Sem esta traducao o usuario
 * veria algo como "conflicting key value violates exclusion constraint".
 */
function traduzirErro(erro: unknown): Error {
  const e = erro as { code?: string; message?: string } | null;
  const codigo = e?.code ?? '';
  const texto = e?.message ?? String(erro);

  // 23P01 — exclusion_violation
  if (codigo === '23P01' || texto.includes('excl_animal_sem_sobreposicao')) {
    return new ErroValidacao(ERRO_SOBREPOSICAO);
  }

  // 23514 — check_violation
  if (codigo === '23514') {
    if (texto.includes('chk_periodo_coerente')) {
      return new ErroValidacao(
        'A data/hora final não pode ser anterior à inicial.',
      );
    }
    if (texto.includes('chk_recorrencia_so_creche')) {
      return new ErroValidacao(
        'Recorrência só é permitida para agendamentos de Creche.',
      );
    }
    if (texto.includes('chk_recorrencia_tem_dias')) {
      return new ErroValidacao(
        'Informe ao menos um dia da semana para a recorrência.',
      );
    }
    if (texto.includes('chk_recorrencia_tem_fim')) {
      return new ErroValidacao(
        'Informe a data final do período da recorrência.',
      );
    }
    if (texto.includes('chk_idade_numerica')) {
      return new ErroValidacao('A idade deve ser um número.');
    }
    if (texto.includes('chk_valor_nao_negativo')) {
      return new ErroValidacao('O valor não pode ser negativo.');
    }
    // Trigger de Visita sem estadia usa este mesmo codigo.
    if (texto.includes('Visita')) {
      return new ErroValidacao(
        'Agendamento do tipo Visita não possui plano de estadia nem pertences.',
      );
    }
  }

  // 23502 — not_null_violation
  if (codigo === '23502' && texto.includes('cpf_cnpj')) {
    return new ErroValidacao('Informe o CPF/CNPJ do tutor.');
  }

  return erro instanceof Error ? erro : new Error(texto);
}

export class RepositorioSupabase implements EstadiasRepositorio {
  private get db() {
    return exigirSupabase();
  }

  /** Embed usado sempre que a lista de agendamentos e carregada. */
  // Os animais vem pela juncao `agendamento_animais`, aninhados dois niveis.
  private readonly selectAgendamento =
    '*, agendamento_animais(animal_id, animais(*, tutores(*))), ' +
    'planos_estadia(*), pertences_deixados(*)';

  // ── Tutores ──

  async listarTutores(): Promise<Tutor[]> {
    const { data, error } = await this.db
      .from('tutores')
      .select()
      .order('nome_completo');
    if (error) throw traduzirErro(error);
    return (data ?? []).map(tutorDeLinha);
  }

  async salvarTutor(tutor: Tutor): Promise<Tutor> {
    const linha = tutorParaLinha(tutor);
    const q = tutor.id
      ? this.db.from('tutores').update(linha).eq('id', tutor.id)
      : this.db.from('tutores').insert(linha);
    const { data, error } = await q.select().single();
    if (error) throw traduzirErro(error);
    return tutorDeLinha(data);
  }

  // ── Animais ──

  async listarAnimais(busca?: string): Promise<Animal[]> {
    let q = this.db.from('animais').select('*, tutores(*)');
    const termo = (busca ?? '').trim();
    if (termo) q = q.or(`nome.ilike.%${termo}%,raca.ilike.%${termo}%`);
    const { data, error } = await q.order('nome');
    if (error) throw traduzirErro(error);
    return (data ?? []).map(animalDeLinha);
  }

  async obterFicha(animalId: string): Promise<FichaAnimal> {
    const { data: animalLinha, error } = await this.db
      .from('animais')
      .select('*, tutores(*)')
      .eq('id', animalId)
      .single();
    if (error) throw traduzirErro(error);
    const animal = animalDeLinha(animalLinha);

    const [vet, anam, termo, contatos] = await Promise.all([
      this.db.from('veterinarios_info').select().eq('animal_id', animalId).maybeSingle(),
      this.db.from('anamneses').select().eq('animal_id', animalId).maybeSingle(),
      this.db.from('termos_consentimento').select().eq('animal_id', animalId).maybeSingle(),
      this.db.from('contatos_emergencia').select().eq('animal_id', animalId).order('ordem'),
    ]);

    return {
      animal,
      tutor: animal.tutor!,
      veterinario: vet.data ? veterinarioDeLinha(vet.data) : null,
      anamnese: anam.data ? anamneseDeLinha(anam.data) : null,
      termo: termo.data ? termoDeLinha(termo.data) : null,
      contatos: (contatos.data ?? []).map(contatoDeLinha),
    };
  }

  async salvarAnimal(animal: Animal): Promise<Animal> {
    const linha = animalParaLinha(animal);
    const q = animal.id
      ? this.db.from('animais').update(linha).eq('id', animal.id)
      : this.db.from('animais').insert(linha);
    const { data, error } = await q.select('*, tutores(*)').single();
    if (error) throw traduzirErro(error);
    return animalDeLinha(data);
  }

  async salvarFicha(ficha: FichaAnimal): Promise<FichaAnimal> {
    const animalId = ficha.animal.id;

    // As tres tabelas 1:1 tem `animal_id` unique — upsert por esse conflito.
    if (ficha.veterinario) {
      const { error } = await this.db
        .from('veterinarios_info')
        .upsert(veterinarioParaLinha(ficha.veterinario), {
          onConflict: 'animal_id',
        });
      if (error) throw traduzirErro(error);
    }
    if (ficha.anamnese) {
      const { error } = await this.db
        .from('anamneses')
        .upsert(anamneseParaLinha(ficha.anamnese), { onConflict: 'animal_id' });
      if (error) throw traduzirErro(error);
    }
    if (ficha.termo) {
      const { error } = await this.db
        .from('termos_consentimento')
        .upsert(termoParaLinha(ficha.termo), { onConflict: 'animal_id' });
      if (error) throw traduzirErro(error);
    }

    // Contatos sao 1:N: substitui o conjunto inteiro.
    const del = await this.db
      .from('contatos_emergencia')
      .delete()
      .eq('animal_id', animalId);
    if (del.error) throw traduzirErro(del.error);

    if (ficha.contatos.length > 0) {
      const { error } = await this.db
        .from('contatos_emergencia')
        .insert(ficha.contatos.map(contatoParaLinha));
      if (error) throw traduzirErro(error);
    }

    return this.obterFicha(animalId);
  }

  // ── Agendamentos ──

  async listarAgendamentos(filtro: FiltroAgendamentos): Promise<Agendamento[]> {
    // `!inner` e necessario para que o filtro por tutor restrinja o
    // agendamento, e nao apenas o objeto embutido.
    // `!inner` faz o filtro restringir o agendamento, e nao apenas o objeto
    // embutido. Com a juncao no meio, o `!inner` precisa valer nos dois
    // niveis, senao um agendamento sem o animal buscado ainda voltaria.
    const select =
      filtro.tutorId || filtro.animalId
        ? '*, agendamento_animais!inner(animal_id, animais!inner(*, tutores(*))), ' +
          'planos_estadia(*), pertences_deixados(*)'
        : this.selectAgendamento;

    let q = this.db.from('agendamentos').select(select);

    if (filtro.animalId) {
      q = q.eq('agendamento_animais.animal_id', filtro.animalId);
    }
    if (filtro.tutorId) {
      q = q.eq('agendamento_animais.animais.tutor_id', filtro.tutorId);
    }
    if (filtro.tipo) q = q.eq('tipo', filtro.tipo);
    if (filtro.status) q = q.eq('status', filtro.status);
    // Semantica de SOBREPOSICAO com o periodo (a mesma do repositorio em
    // memoria): um agendamento entra se ele *cruza* o intervalo, e nao
    // apenas se comeca dentro dele. Sem isso, uma hospedagem de 28/07 a
    // 03/08 desapareceria do calendario de agosto.
    if (filtro.dataInicio) {
      const desde = filtro.dataInicio.toISOString();
      // Termina depois do inicio do periodo — ou nao tem fim definido, e ai
      // vale a propria data de inicio.
      q = q.or(
        `data_hora_fim.gte."${desde}",` +
          `and(data_hora_fim.is.null,data_hora_inicio.gte."${desde}")`,
      );
    }
    if (filtro.dataFim) {
      q = q.lte('data_hora_inicio', filtro.dataFim.toISOString());
    }

    const { data, error } = await q.order('data_hora_inicio');
    if (error) throw traduzirErro(error);
    return (data ?? []).map((l) => agendamentoDeLinha(l as any));
  }

  async obterAgendamento(id: string): Promise<Agendamento> {
    const { data, error } = await this.db
      .from('agendamentos')
      .select(this.selectAgendamento)
      .eq('id', id)
      .single();
    if (error) throw traduzirErro(error);
    return agendamentoDeLinha(data as any);
  }

  async listarOcorrencias(recorrenciaId: string): Promise<Agendamento[]> {
    const { data, error } = await this.db
      .from('agendamentos')
      .select(this.selectAgendamento)
      .eq('agendamento_recorrencia_id', recorrenciaId)
      .order('data_hora_inicio', { ascending: true });
    if (error) throw traduzirErro(error);
    return (data as any[]).map(agendamentoDeLinha);
  }

  async criarAgendamento(entrada: EntradaAgendamento): Promise<Agendamento[]> {
    garantirValido(entrada);

    if (geraRecorrencia(entrada)) {
      // A regra de geracao vive no banco (ver 02_fn_gerar_ocorrencias.sql):
      // a RPC devolve os ids das ocorrencias criadas.
      const { data: ids, error } = await this.db.rpc(
        'gerar_ocorrencias_recorrencia',
        {
          p_animal_ids: entrada.animalIds,
          p_data_inicio: entrada.dataHoraInicio.toISOString(),
          p_data_fim: entrada.dataHoraFim!.toISOString(),
          p_dias_semana: entrada.diasSemanaRecorrencia,
          p_status: entrada.status,
          p_observacoes: entrada.observacoes,
          p_plano: entrada.planoEstadia
            ? planoParaLinha(entrada.planoEstadia)
            : null,
          p_pertences: entrada.pertencesDeixados
            ? pertencesParaLinha(entrada.pertencesDeixados)
            : null,
        },
      );
      if (error) throw traduzirErro(error);

      const lista = (ids ?? []) as string[];
      if (lista.length === 0) return [];

      const { data, error: erroBusca } = await this.db
        .from('agendamentos')
        .select(this.selectAgendamento)
        .in('id', lista)
        .order('data_hora_inicio');
      if (erroBusca) throw traduzirErro(erroBusca);
      return (data ?? []).map((l) => agendamentoDeLinha(l as any));
    }

    // RPC em vez de 4 inserts soltos: cada chamada PostgREST e sua propria
    // transacao, entao uma rejeicao da constraint de sobreposicao deixava o
    // agendamento gravado sem nenhum cao. Aqui ou grava tudo, ou nada.
    const { data: id, error } = await this.db.rpc('criar_agendamento', {
      p_animal_ids: entrada.animalIds,
      p_tipo: entrada.tipo,
      p_data_hora_inicio: entrada.dataHoraInicio.toISOString(),
      p_data_hora_fim: entrada.dataHoraFim?.toISOString() ?? null,
      p_status: entrada.status,
      p_observacoes: entrada.observacoes,
      p_plano: entrada.planoEstadia ? planoParaLinha(entrada.planoEstadia) : null,
      p_pertences: entrada.pertencesDeixados
        ? pertencesParaLinha(entrada.pertencesDeixados)
        : null,
    });
    if (error) throw traduzirErro(error);

    return [await this.obterAgendamento(id as string)];
  }

  async atualizarAgendamento(
    id: string,
    entrada: EntradaAgendamento,
  ): Promise<Agendamento> {
    garantirValido(entrada);

    // Mesma razao da criacao: transacao unica no banco.
    const { error } = await this.db.rpc('atualizar_agendamento', {
      p_id: id,
      p_animal_ids: entrada.animalIds,
      p_tipo: entrada.tipo,
      p_data_hora_inicio: entrada.dataHoraInicio.toISOString(),
      p_data_hora_fim: entrada.dataHoraFim?.toISOString() ?? null,
      p_status: entrada.status,
      p_observacoes: entrada.observacoes,
      p_plano: entrada.planoEstadia ? planoParaLinha(entrada.planoEstadia) : null,
      p_pertences: entrada.pertencesDeixados
        ? pertencesParaLinha(entrada.pertencesDeixados)
        : null,
    });
    if (error) throw traduzirErro(error);

    return this.obterAgendamento(id);
  }



  async cancelarAgendamento(id: string): Promise<Agendamento> {
    // Cancelar muda o status; o registro nunca e apagado.
    const { error } = await this.db
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id);
    if (error) throw traduzirErro(error);
    return this.obterAgendamento(id);
  }

  async cancelarSerie(
    recorrenciaId: string,
    aPartirDe: Date,
  ): Promise<Agendamento[]> {
    // Um unico UPDATE: o banco resolve a serie inteira numa transacao, e o
    // trigger do Google dispara uma vez por linha alterada, apagando os
    // eventos correspondentes.
    const { data, error } = await this.db
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('agendamento_recorrencia_id', recorrenciaId)
      .neq('status', 'cancelado')
      .gte('data_hora_inicio', aPartirDe.toISOString())
      .select(this.selectAgendamento)
      .order('data_hora_inicio', { ascending: true });
    if (error) throw traduzirErro(error);
    return (data as any[]).map(agendamentoDeLinha);
  }
}
