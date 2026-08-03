import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/agendamento.dart';
import '../models/anamnese.dart';
import '../models/animal.dart';
import '../models/contato_emergencia.dart';
import '../models/entrada_agendamento.dart';
import '../models/enums.dart';
import '../models/ficha_animal.dart';
import '../models/filtro_agendamentos.dart';
import '../models/termo_consentimento.dart';
import '../models/tutor.dart';
import '../models/veterinario_info.dart';
import 'estadias_repository.dart';

/// Implementacao sobre o Supabase (PostgREST).
///
/// Escrita contra o schema real ja verificado no projeto. Para ativar, troque
/// o override de `estadiasRepositoryProvider` e rode o app com
/// `--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`.
///
/// Depende dos scripts em `supabase/`:
///   * `01_rls_policies.sql` — RLS liberando `authenticated`;
///   * `02_fn_gerar_ocorrencias.sql` — RPC de recorrencia.
class SupabaseEstadiasRepository implements EstadiasRepository {
  SupabaseEstadiasRepository(this._db);

  final SupabaseClient _db;

  /// Embed usado sempre que a lista de agendamentos e carregada.
  static const _selectAgendamento =
      '*, animais(*, tutores(*)), planos_estadia(*), pertences_deixados(*)';

  // ── Tutores ─────────────────────────────────────────────────────────────

  @override
  Future<List<Tutor>> listarTutores() async {
    final dados = await _db.from('tutores').select().order('nome_completo');
    return dados.map(Tutor.fromJson).toList();
  }

  @override
  Future<Tutor> salvarTutor(Tutor tutor) async {
    if (tutor.id.isEmpty) {
      final linha =
          await _db.from('tutores').insert(tutor.toJson()).select().single();
      return Tutor.fromJson(linha);
    }
    final linha = await _db
        .from('tutores')
        .update(tutor.toJson())
        .eq('id', tutor.id)
        .select()
        .single();
    return Tutor.fromJson(linha);
  }

  // ── Animais ─────────────────────────────────────────────────────────────

  @override
  Future<List<Animal>> listarAnimais({String? busca}) async {
    var consulta = _db.from('animais').select('*, tutores(*)');
    final termo = (busca ?? '').trim();
    if (termo.isNotEmpty) {
      consulta = consulta.or('nome.ilike.%$termo%,raca.ilike.%$termo%');
    }
    final dados = await consulta.order('nome');
    return dados.map(Animal.fromJson).toList();
  }

  @override
  Future<FichaAnimal> obterFicha(String animalId) async {
    final animalLinha = await _db
        .from('animais')
        .select('*, tutores(*)')
        .eq('id', animalId)
        .single();
    final animal = Animal.fromJson(animalLinha);

    final veterinario = await _db
        .from('veterinarios_info')
        .select()
        .eq('animal_id', animalId)
        .maybeSingle();
    final anamnese = await _db
        .from('anamneses')
        .select()
        .eq('animal_id', animalId)
        .maybeSingle();
    final termo = await _db
        .from('termos_consentimento')
        .select()
        .eq('animal_id', animalId)
        .maybeSingle();
    final contatos = await _db
        .from('contatos_emergencia')
        .select()
        .eq('animal_id', animalId)
        .order('ordem');

    return FichaAnimal(
      animal: animal,
      tutor: animal.tutor!,
      veterinario:
          veterinario == null ? null : VeterinarioInfo.fromJson(veterinario),
      anamnese: anamnese == null ? null : Anamnese.fromJson(anamnese),
      termo: termo == null ? null : TermoConsentimento.fromJson(termo),
      contatos: contatos.map(ContatoEmergencia.fromJson).toList(),
    );
  }

  @override
  Future<Animal> salvarAnimal(Animal animal) async {
    if (animal.id.isEmpty) {
      final linha = await _db
          .from('animais')
          .insert(animal.toJson())
          .select('*, tutores(*)')
          .single();
      return Animal.fromJson(linha);
    }
    final linha = await _db
        .from('animais')
        .update(animal.toJson())
        .eq('id', animal.id)
        .select('*, tutores(*)')
        .single();
    return Animal.fromJson(linha);
  }

  @override
  Future<FichaAnimal> salvarFicha(FichaAnimal ficha) async {
    final animalId = ficha.animal.id;

    // As tres tabelas 1:1 tem `animal_id` unique — upsert por esse conflito.
    if (ficha.veterinario != null) {
      await _db
          .from('veterinarios_info')
          .upsert(ficha.veterinario!.toJson(), onConflict: 'animal_id');
    }
    if (ficha.anamnese != null) {
      await _db
          .from('anamneses')
          .upsert(ficha.anamnese!.toJson(), onConflict: 'animal_id');
    }
    if (ficha.termo != null) {
      await _db
          .from('termos_consentimento')
          .upsert(ficha.termo!.toJson(), onConflict: 'animal_id');
    }

    // Contatos sao 1:N: substitui o conjunto inteiro.
    await _db.from('contatos_emergencia').delete().eq('animal_id', animalId);
    if (ficha.contatos.isNotEmpty) {
      await _db
          .from('contatos_emergencia')
          .insert(ficha.contatos.map((c) => c.toJson()).toList());
    }

    return obterFicha(animalId);
  }

  // ── Agendamentos ────────────────────────────────────────────────────────

  @override
  Future<List<Agendamento>> listarAgendamentos(
    FiltroAgendamentos filtro,
  ) async {
    // `!inner` e necessario para que o filtro por tutor restrinja o
    // agendamento, e nao apenas o objeto embutido.
    final select = filtro.tutorId != null
        ? '*, animais!inner(*, tutores(*)), planos_estadia(*), '
              'pertences_deixados(*)'
        : _selectAgendamento;

    var consulta = _db.from('agendamentos').select(select);

    if (filtro.animalId != null) {
      consulta = consulta.eq('animal_id', filtro.animalId!);
    }
    if (filtro.tutorId != null) {
      consulta = consulta.eq('animais.tutor_id', filtro.tutorId!);
    }
    if (filtro.tipo != null) {
      consulta = consulta.eq('tipo', filtro.tipo!.valor);
    }
    if (filtro.status != null) {
      consulta = consulta.eq('status', filtro.status!.valor);
    }
    if (filtro.dataInicio != null) {
      consulta = consulta.gte(
        'data_hora_inicio',
        filtro.dataInicio!.toIso8601String(),
      );
    }
    if (filtro.dataFim != null) {
      consulta = consulta.lte(
        'data_hora_inicio',
        filtro.dataFim!.toIso8601String(),
      );
    }

    final dados = await consulta.order('data_hora_inicio');
    return dados.map(Agendamento.fromJson).toList();
  }

  @override
  Future<Agendamento> obterAgendamento(String id) async {
    final linha = await _db
        .from('agendamentos')
        .select(_selectAgendamento)
        .eq('id', id)
        .single();
    return Agendamento.fromJson(linha);
  }

  @override
  Future<List<Agendamento>> criarAgendamento(
    EntradaAgendamento entrada,
  ) async {
    ValidacaoAgendamento.garantirValido(entrada);

    if (entrada.geraRecorrencia) {
      // A regra de geracao vive no banco (ver 02_fn_gerar_ocorrencias.sql):
      // a RPC devolve os ids das ocorrencias criadas.
      final ids = await _db.rpc<List<dynamic>>(
        'gerar_ocorrencias_recorrencia',
        params: {
          'p_animal_id': entrada.animalId,
          'p_data_inicio': entrada.dataHoraInicio.toIso8601String(),
          'p_data_fim': entrada.dataHoraFim!.toIso8601String(),
          'p_dias_semana':
              entrada.diasSemanaRecorrencia.map((d) => d.valor).toList(),
          'p_status': entrada.status.valor,
          'p_observacoes': entrada.observacoes,
          'p_plano': entrada.planoEstadia?.toJson(),
          'p_pertences': entrada.pertencesDeixados?.toJson(),
        },
      );

      if (ids.isEmpty) return const [];
      final dados = await _db
          .from('agendamentos')
          .select(_selectAgendamento)
          .inFilter('id', ids.cast<String>())
          .order('data_hora_inicio');
      return dados.map(Agendamento.fromJson).toList();
    }

    final linha = await _db
        .from('agendamentos')
        .insert({
          'animal_id': entrada.animalId,
          'tipo': entrada.tipo.valor,
          'data_hora_inicio': entrada.dataHoraInicio.toIso8601String(),
          'data_hora_fim': entrada.dataHoraFim?.toIso8601String(),
          'status': entrada.status.valor,
          'recorrente': entrada.recorrente,
          'dias_semana_recorrencia':
              entrada.diasSemanaRecorrencia.map((d) => d.valor).toList(),
          'observacoes': entrada.observacoes,
        })
        .select()
        .single();

    final id = linha['id'] as String;
    await _gravarRelacionados(id, entrada);
    return [await obterAgendamento(id)];
  }

  @override
  Future<Agendamento> atualizarAgendamento(
    String id,
    EntradaAgendamento entrada,
  ) async {
    ValidacaoAgendamento.garantirValido(entrada);

    await _db
        .from('agendamentos')
        .update({
          'animal_id': entrada.animalId,
          'tipo': entrada.tipo.valor,
          'data_hora_inicio': entrada.dataHoraInicio.toIso8601String(),
          'data_hora_fim': entrada.dataHoraFim?.toIso8601String(),
          'status': entrada.status.valor,
          'observacoes': entrada.observacoes,
        })
        .eq('id', id);

    await _db.from('planos_estadia').delete().eq('agendamento_id', id);
    await _db.from('pertences_deixados').delete().eq('agendamento_id', id);
    await _gravarRelacionados(id, entrada);

    return obterAgendamento(id);
  }

  Future<void> _gravarRelacionados(
    String agendamentoId,
    EntradaAgendamento entrada,
  ) async {
    if (entrada.planoEstadia != null) {
      await _db.from('planos_estadia').insert({
        ...entrada.planoEstadia!.toJson(),
        'agendamento_id': agendamentoId,
      });
    }
    if (entrada.pertencesDeixados != null) {
      await _db.from('pertences_deixados').insert({
        ...entrada.pertencesDeixados!.toJson(),
        'agendamento_id': agendamentoId,
      });
    }
  }

  @override
  Future<Agendamento> cancelarAgendamento(String id) async {
    // Cancelar muda o status; o registro nunca e apagado.
    await _db
        .from('agendamentos')
        .update({'status': StatusAgendamento.cancelado.valor})
        .eq('id', id);
    return obterAgendamento(id);
  }
}
