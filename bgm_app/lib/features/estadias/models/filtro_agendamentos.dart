import 'enums.dart';

/// Filtros combinaveis da aba Agendamentos.
///
/// Campos nulos significam "sem filtro". Como `copyWith` nao consegue
/// distinguir "nao informado" de "limpar", use os metodos `limpar*`.
class FiltroAgendamentos {
  const FiltroAgendamentos({
    this.animalId,
    this.tutorId,
    this.tipo,
    this.status,
    this.dataInicio,
    this.dataFim,
  });

  final String? animalId;
  final String? tutorId;
  final TipoAgendamento? tipo;
  final StatusAgendamento? status;
  final DateTime? dataInicio;
  final DateTime? dataFim;

  bool get vazio =>
      animalId == null &&
      tutorId == null &&
      tipo == null &&
      status == null &&
      dataInicio == null &&
      dataFim == null;

  int get quantidadeAtiva => [
    animalId,
    tutorId,
    tipo,
    status,
    dataInicio,
    dataFim,
  ].where((e) => e != null).length;

  FiltroAgendamentos copyWith({
    String? animalId,
    String? tutorId,
    TipoAgendamento? tipo,
    StatusAgendamento? status,
    DateTime? dataInicio,
    DateTime? dataFim,
  }) => FiltroAgendamentos(
    animalId: animalId ?? this.animalId,
    tutorId: tutorId ?? this.tutorId,
    tipo: tipo ?? this.tipo,
    status: status ?? this.status,
    dataInicio: dataInicio ?? this.dataInicio,
    dataFim: dataFim ?? this.dataFim,
  );

  FiltroAgendamentos limparAnimal() => FiltroAgendamentos(
    tutorId: tutorId,
    tipo: tipo,
    status: status,
    dataInicio: dataInicio,
    dataFim: dataFim,
  );

  FiltroAgendamentos limparTutor() => FiltroAgendamentos(
    animalId: animalId,
    tipo: tipo,
    status: status,
    dataInicio: dataInicio,
    dataFim: dataFim,
  );

  FiltroAgendamentos limparTipo() => FiltroAgendamentos(
    animalId: animalId,
    tutorId: tutorId,
    status: status,
    dataInicio: dataInicio,
    dataFim: dataFim,
  );

  FiltroAgendamentos limparStatus() => FiltroAgendamentos(
    animalId: animalId,
    tutorId: tutorId,
    tipo: tipo,
    dataInicio: dataInicio,
    dataFim: dataFim,
  );

  FiltroAgendamentos limparPeriodo() => FiltroAgendamentos(
    animalId: animalId,
    tutorId: tutorId,
    tipo: tipo,
    status: status,
  );

  @override
  bool operator ==(Object other) =>
      other is FiltroAgendamentos &&
      other.animalId == animalId &&
      other.tutorId == tutorId &&
      other.tipo == tipo &&
      other.status == status &&
      other.dataInicio == dataInicio &&
      other.dataFim == dataFim;

  @override
  int get hashCode =>
      Object.hash(animalId, tutorId, tipo, status, dataInicio, dataFim);
}
