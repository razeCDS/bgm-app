import { exigirSupabase } from '../../../lib/supabase';
import {
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
export class RepositorioSupabase implements EstadiasRepositorio {
  private get db() {
    return exigirSupabase();
  }

  /** Embed usado sempre que a lista de agendamentos e carregada. */
  private readonly selectAgendamento =
    '*, animais(*, tutores(*)), planos_estadia(*), pertences_deixados(*)';

  // ── Tutores ──

  async listarTutores(): Promise<Tutor[]> {
    const { data, error } = await this.db
      .from('tutores')
      .select()
      .order('nome_completo');
    if (error) throw error;
    return (data ?? []).map(tutorDeLinha);
  }

  async salvarTutor(tutor: Tutor): Promise<Tutor> {
    const linha = tutorParaLinha(tutor);
    const q = tutor.id
      ? this.db.from('tutores').update(linha).eq('id', tutor.id)
      : this.db.from('tutores').insert(linha);
    const { data, error } = await q.select().single();
    if (error) throw error;
    return tutorDeLinha(data);
  }

  // ── Animais ──

  async listarAnimais(busca?: string): Promise<Animal[]> {
    let q = this.db.from('animais').select('*, tutores(*)');
    const termo = (busca ?? '').trim();
    if (termo) q = q.or(`nome.ilike.%${termo}%,raca.ilike.%${termo}%`);
    const { data, error } = await q.order('nome');
    if (error) throw error;
    return (data ?? []).map(animalDeLinha);
  }

  async obterFicha(animalId: string): Promise<FichaAnimal> {
    const { data: animalLinha, error } = await this.db
      .from('animais')
      .select('*, tutores(*)')
      .eq('id', animalId)
      .single();
    if (error) throw error;
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
    if (error) throw error;
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
      if (error) throw error;
    }
    if (ficha.anamnese) {
      const { error } = await this.db
        .from('anamneses')
        .upsert(anamneseParaLinha(ficha.anamnese), { onConflict: 'animal_id' });
      if (error) throw error;
    }
    if (ficha.termo) {
      const { error } = await this.db
        .from('termos_consentimento')
        .upsert(termoParaLinha(ficha.termo), { onConflict: 'animal_id' });
      if (error) throw error;
    }

    // Contatos sao 1:N: substitui o conjunto inteiro.
    const del = await this.db
      .from('contatos_emergencia')
      .delete()
      .eq('animal_id', animalId);
    if (del.error) throw del.error;

    if (ficha.contatos.length > 0) {
      const { error } = await this.db
        .from('contatos_emergencia')
        .insert(ficha.contatos.map(contatoParaLinha));
      if (error) throw error;
    }

    return this.obterFicha(animalId);
  }

  // ── Agendamentos ──

  async listarAgendamentos(filtro: FiltroAgendamentos): Promise<Agendamento[]> {
    // `!inner` e necessario para que o filtro por tutor restrinja o
    // agendamento, e nao apenas o objeto embutido.
    const select = filtro.tutorId
      ? '*, animais!inner(*, tutores(*)), planos_estadia(*), pertences_deixados(*)'
      : this.selectAgendamento;

    let q = this.db.from('agendamentos').select(select);

    if (filtro.animalId) q = q.eq('animal_id', filtro.animalId);
    if (filtro.tutorId) q = q.eq('animais.tutor_id', filtro.tutorId);
    if (filtro.tipo) q = q.eq('tipo', filtro.tipo);
    if (filtro.status) q = q.eq('status', filtro.status);
    if (filtro.dataInicio) {
      q = q.gte('data_hora_inicio', filtro.dataInicio.toISOString());
    }
    if (filtro.dataFim) {
      q = q.lte('data_hora_inicio', filtro.dataFim.toISOString());
    }

    const { data, error } = await q.order('data_hora_inicio');
    if (error) throw error;
    return (data ?? []).map((l) => agendamentoDeLinha(l as any));
  }

  async obterAgendamento(id: string): Promise<Agendamento> {
    const { data, error } = await this.db
      .from('agendamentos')
      .select(this.selectAgendamento)
      .eq('id', id)
      .single();
    if (error) throw error;
    return agendamentoDeLinha(data as any);
  }

  async criarAgendamento(entrada: EntradaAgendamento): Promise<Agendamento[]> {
    garantirValido(entrada);

    if (geraRecorrencia(entrada)) {
      // A regra de geracao vive no banco (ver 02_fn_gerar_ocorrencias.sql):
      // a RPC devolve os ids das ocorrencias criadas.
      const { data: ids, error } = await this.db.rpc(
        'gerar_ocorrencias_recorrencia',
        {
          p_animal_id: entrada.animalId,
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
      if (error) throw error;

      const lista = (ids ?? []) as string[];
      if (lista.length === 0) return [];

      const { data, error: erroBusca } = await this.db
        .from('agendamentos')
        .select(this.selectAgendamento)
        .in('id', lista)
        .order('data_hora_inicio');
      if (erroBusca) throw erroBusca;
      return (data ?? []).map((l) => agendamentoDeLinha(l as any));
    }

    const { data, error } = await this.db
      .from('agendamentos')
      .insert({
        animal_id: entrada.animalId,
        tipo: entrada.tipo,
        data_hora_inicio: entrada.dataHoraInicio.toISOString(),
        data_hora_fim: entrada.dataHoraFim?.toISOString() ?? null,
        status: entrada.status,
        recorrente: entrada.recorrente,
        dias_semana_recorrencia: entrada.diasSemanaRecorrencia,
        observacoes: entrada.observacoes,
      })
      .select()
      .single();
    if (error) throw error;

    const id = data.id as string;
    await this.gravarRelacionados(id, entrada);
    return [await this.obterAgendamento(id)];
  }

  async atualizarAgendamento(
    id: string,
    entrada: EntradaAgendamento,
  ): Promise<Agendamento> {
    garantirValido(entrada);

    const { error } = await this.db
      .from('agendamentos')
      .update({
        animal_id: entrada.animalId,
        tipo: entrada.tipo,
        data_hora_inicio: entrada.dataHoraInicio.toISOString(),
        data_hora_fim: entrada.dataHoraFim?.toISOString() ?? null,
        status: entrada.status,
        observacoes: entrada.observacoes,
      })
      .eq('id', id);
    if (error) throw error;

    await this.db.from('planos_estadia').delete().eq('agendamento_id', id);
    await this.db.from('pertences_deixados').delete().eq('agendamento_id', id);
    await this.gravarRelacionados(id, entrada);

    return this.obterAgendamento(id);
  }

  private async gravarRelacionados(
    agendamentoId: string,
    entrada: EntradaAgendamento,
  ): Promise<void> {
    if (entrada.planoEstadia) {
      const { error } = await this.db.from('planos_estadia').insert({
        ...planoParaLinha(entrada.planoEstadia),
        agendamento_id: agendamentoId,
      });
      if (error) throw error;
    }
    if (entrada.pertencesDeixados) {
      const { error } = await this.db.from('pertences_deixados').insert({
        ...pertencesParaLinha(entrada.pertencesDeixados),
        agendamento_id: agendamentoId,
      });
      if (error) throw error;
    }
  }

  async cancelarAgendamento(id: string): Promise<Agendamento> {
    // Cancelar muda o status; o registro nunca e apagado.
    const { error } = await this.db
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id);
    if (error) throw error;
    return this.obterAgendamento(id);
  }
}
