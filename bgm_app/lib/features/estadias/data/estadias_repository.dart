import '../models/agendamento.dart';
import '../models/animal.dart';
import '../models/entrada_agendamento.dart';
import '../models/ficha_animal.dart';
import '../models/filtro_agendamentos.dart';
import '../models/tutor.dart';

/// Contrato de acesso a dados do modulo Estadias.
///
/// Duas implementacoes: [FakeEstadiasRepository] (em memoria, usada enquanto
/// a integracao com o Supabase nao esta ligada) e
/// [SupabaseEstadiasRepository] (PostgREST).
abstract interface class EstadiasRepository {
  // ── Tutores ─────────────────────────────────────────────────────────────
  Future<List<Tutor>> listarTutores();

  /// Insere quando [Tutor.id] esta vazio; caso contrario atualiza.
  Future<Tutor> salvarTutor(Tutor tutor);

  // ── Animais ─────────────────────────────────────────────────────────────
  Future<List<Animal>> listarAnimais({String? busca});

  Future<FichaAnimal> obterFicha(String animalId);

  /// Insere quando [Animal.id] esta vazio; caso contrario atualiza.
  Future<Animal> salvarAnimal(Animal animal);

  /// Grava as entidades associadas da ficha (veterinario, anamnese, termo,
  /// contatos de emergencia) em uma unica operacao.
  Future<FichaAnimal> salvarFicha(FichaAnimal ficha);

  // ── Agendamentos ────────────────────────────────────────────────────────
  Future<List<Agendamento>> listarAgendamentos(FiltroAgendamentos filtro);

  Future<Agendamento> obterAgendamento(String id);

  /// Cria o agendamento. Quando [EntradaAgendamento.geraRecorrencia] e `true`,
  /// gera uma ocorrencia por dia marcado dentro do periodo e devolve todas
  /// (compartilhando o mesmo `agendamento_recorrencia_id`).
  Future<List<Agendamento>> criarAgendamento(EntradaAgendamento entrada);

  Future<Agendamento> atualizarAgendamento(
    String id,
    EntradaAgendamento entrada,
  );

  /// Cancelamento e mudanca de status — o registro nunca e apagado.
  Future<Agendamento> cancelarAgendamento(String id);
}
