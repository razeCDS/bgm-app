import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/estadias_repository.dart';
import '../data/fake_estadias_repository.dart';
import '../models/agendamento.dart';
import '../models/animal.dart';
import '../models/entrada_agendamento.dart';
import '../models/ficha_animal.dart';
import '../models/filtro_agendamentos.dart';
import '../models/tutor.dart';

/// Implementacao ativa do repositorio.
///
/// Enquanto a integracao com o Supabase nao esta ligada, o app roda com
/// dados em memoria. Para ligar, troque por:
///
/// ```dart
/// SupabaseEstadiasRepository(Supabase.instance.client)
/// ```
final estadiasRepositoryProvider = Provider<EstadiasRepository>(
  (ref) => FakeEstadiasRepository(),
);

// ── Tutores ───────────────────────────────────────────────────────────────

final tutoresProvider = FutureProvider<List<Tutor>>(
  (ref) => ref.watch(estadiasRepositoryProvider).listarTutores(),
);

// ── Animais ───────────────────────────────────────────────────────────────

/// Texto da busca da aba Caes.
final buscaAnimaisProvider = NotifierProvider<BuscaAnimaisNotifier, String>(
  BuscaAnimaisNotifier.new,
);

class BuscaAnimaisNotifier extends Notifier<String> {
  @override
  String build() => '';

  void definir(String valor) => state = valor;
  void limpar() => state = '';
}

final animaisProvider = FutureProvider<List<Animal>>((ref) {
  final busca = ref.watch(buscaAnimaisProvider);
  return ref.watch(estadiasRepositoryProvider).listarAnimais(busca: busca);
});

final fichaAnimalProvider = FutureProvider.family<FichaAnimal, String>(
  (ref, animalId) =>
      ref.watch(estadiasRepositoryProvider).obterFicha(animalId),
);

// ── Agendamentos ──────────────────────────────────────────────────────────

final filtroAgendamentosProvider =
    NotifierProvider<FiltroAgendamentosNotifier, FiltroAgendamentos>(
      FiltroAgendamentosNotifier.new,
    );

class FiltroAgendamentosNotifier extends Notifier<FiltroAgendamentos> {
  @override
  FiltroAgendamentos build() => const FiltroAgendamentos();

  void definir(FiltroAgendamentos filtro) => state = filtro;
  void limparTudo() => state = const FiltroAgendamentos();
}

final agendamentosProvider = FutureProvider<List<Agendamento>>((ref) {
  final filtro = ref.watch(filtroAgendamentosProvider);
  return ref.watch(estadiasRepositoryProvider).listarAgendamentos(filtro);
});

final agendamentoProvider = FutureProvider.family<Agendamento, String>(
  (ref, id) => ref.watch(estadiasRepositoryProvider).obterAgendamento(id),
);

/// Acoes de escrita. Invalidam os providers de leitura afetados para que as
/// listas recarreguem sozinhas.
final acoesEstadiasProvider = Provider<AcoesEstadias>(
  (ref) => AcoesEstadias(ref),
);

class AcoesEstadias {
  AcoesEstadias(this._ref);
  final Ref _ref;

  EstadiasRepository get _repo => _ref.read(estadiasRepositoryProvider);

  void _recarregarAgendamentos() {
    _ref.invalidate(agendamentosProvider);
  }

  void _recarregarAnimais() {
    _ref.invalidate(animaisProvider);
    _ref.invalidate(tutoresProvider);
  }

  Future<Tutor> salvarTutor(Tutor tutor) async {
    final salvo = await _repo.salvarTutor(tutor);
    _recarregarAnimais();
    return salvo;
  }

  Future<Animal> salvarAnimal(Animal animal) async {
    final salvo = await _repo.salvarAnimal(animal);
    _recarregarAnimais();
    _ref.invalidate(fichaAnimalProvider);
    return salvo;
  }

  Future<FichaAnimal> salvarFicha(FichaAnimal ficha) async {
    final salva = await _repo.salvarFicha(ficha);
    _ref.invalidate(fichaAnimalProvider);
    _recarregarAnimais();
    return salva;
  }

  /// Devolve todas as ocorrencias criadas (1 no caso comum, N na recorrencia).
  Future<List<Agendamento>> criarAgendamento(
    EntradaAgendamento entrada,
  ) async {
    final criados = await _repo.criarAgendamento(entrada);
    _recarregarAgendamentos();
    return criados;
  }

  Future<Agendamento> atualizarAgendamento(
    String id,
    EntradaAgendamento entrada,
  ) async {
    final atualizado = await _repo.atualizarAgendamento(id, entrada);
    _recarregarAgendamentos();
    _ref.invalidate(agendamentoProvider(id));
    return atualizado;
  }

  Future<Agendamento> cancelarAgendamento(String id) async {
    final cancelado = await _repo.cancelarAgendamento(id);
    _recarregarAgendamentos();
    _ref.invalidate(agendamentoProvider(id));
    return cancelado;
  }
}
