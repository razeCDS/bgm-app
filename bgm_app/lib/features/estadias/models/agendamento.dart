import 'animal.dart';
import 'enums.dart';
import 'pertences_deixados.dart';
import 'plano_estadia.dart';

/// Tabela `agendamentos`.
class Agendamento {
  const Agendamento({
    required this.id,
    required this.animalId,
    required this.tipo,
    required this.dataHoraInicio,
    required this.status,
    this.dataHoraFim,
    this.recorrente = false,
    this.diasSemanaRecorrencia = const [],
    this.agendamentoRecorrenciaId,
    this.observacoes,
    this.googleCalendarEventId,
    this.animal,
    this.planoEstadia,
    this.pertencesDeixados,
  });

  final String id;
  final String animalId;
  final TipoAgendamento tipo;
  final DateTime dataHoraInicio;

  /// Opcional no banco: existe agendamento sem data final definida.
  final DateTime? dataHoraFim;

  final StatusAgendamento status;
  final bool recorrente;

  /// Convencao Postgres: 0 = domingo ... 6 = sabado.
  final List<DiaSemana> diasSemanaRecorrencia;

  /// Agrupa as ocorrencias geradas por uma mesma regra de recorrencia.
  /// Todas as ocorrencias de uma serie compartilham este id.
  final String? agendamentoRecorrenciaId;

  final String? observacoes;

  /// Reservado para a fase de integracao com o Google Agenda.
  final String? googleCalendarEventId;

  // Relacionamentos embutidos.
  final Animal? animal;
  final PlanoEstadia? planoEstadia;
  final PertencesDeixados? pertencesDeixados;

  bool get pertenceASerie => agendamentoRecorrenciaId != null;

  factory Agendamento.fromJson(Map<String, dynamic> json) {
    final animalBruto = json['animais'];
    final planoBruto = json['planos_estadia'];
    final pertencesBruto = json['pertences_deixados'];

    // Embeds 1:1 podem chegar como objeto ou como lista de um item.
    Map<String, dynamic>? umDe(Object? bruto) {
      if (bruto is Map<String, dynamic>) return bruto;
      if (bruto is List && bruto.isNotEmpty) {
        final primeiro = bruto.first;
        if (primeiro is Map<String, dynamic>) return primeiro;
      }
      return null;
    }

    final plano = umDe(planoBruto);
    final pertences = umDe(pertencesBruto);
    final animal = umDe(animalBruto);

    return Agendamento(
      id: json['id'] as String,
      animalId: json['animal_id'] as String,
      tipo: TipoAgendamento.porValor(json['tipo'] as String?) ??
          TipoAgendamento.visita,
      dataHoraInicio: DateTime.parse(json['data_hora_inicio'] as String),
      dataHoraFim: json['data_hora_fim'] == null
          ? null
          : DateTime.tryParse(json['data_hora_fim'] as String),
      status: StatusAgendamento.porValor(json['status'] as String?) ??
          StatusAgendamento.solicitado,
      recorrente: json['recorrente'] as bool? ?? false,
      diasSemanaRecorrencia:
          (json['dias_semana_recorrencia'] as List?)
              ?.map((e) => DiaSemana.porValor(e as int))
              .toList() ??
          const [],
      agendamentoRecorrenciaId: json['agendamento_recorrencia_id'] as String?,
      observacoes: json['observacoes'] as String?,
      googleCalendarEventId: json['google_calendar_event_id'] as String?,
      animal: animal == null ? null : Animal.fromJson(animal),
      planoEstadia: plano == null ? null : PlanoEstadia.fromJson(plano),
      pertencesDeixados:
          pertences == null ? null : PertencesDeixados.fromJson(pertences),
    );
  }

  /// Apenas as colunas da propria tabela — os relacionamentos sao
  /// gravados separadamente pelo repositorio.
  Map<String, dynamic> toJson() => {
    'animal_id': animalId,
    'tipo': tipo.valor,
    'data_hora_inicio': dataHoraInicio.toIso8601String(),
    'data_hora_fim': dataHoraFim?.toIso8601String(),
    'status': status.valor,
    'recorrente': recorrente,
    'dias_semana_recorrencia':
        diasSemanaRecorrencia.map((e) => e.valor).toList(),
    'agendamento_recorrencia_id': agendamentoRecorrenciaId,
    'observacoes': observacoes,
    'google_calendar_event_id': googleCalendarEventId,
  };

  Agendamento copyWith({
    String? id,
    String? animalId,
    TipoAgendamento? tipo,
    DateTime? dataHoraInicio,
    DateTime? dataHoraFim,
    StatusAgendamento? status,
    bool? recorrente,
    List<DiaSemana>? diasSemanaRecorrencia,
    String? agendamentoRecorrenciaId,
    String? observacoes,
    String? googleCalendarEventId,
    Animal? animal,
    PlanoEstadia? planoEstadia,
    PertencesDeixados? pertencesDeixados,
  }) => Agendamento(
    id: id ?? this.id,
    animalId: animalId ?? this.animalId,
    tipo: tipo ?? this.tipo,
    dataHoraInicio: dataHoraInicio ?? this.dataHoraInicio,
    dataHoraFim: dataHoraFim ?? this.dataHoraFim,
    status: status ?? this.status,
    recorrente: recorrente ?? this.recorrente,
    diasSemanaRecorrencia:
        diasSemanaRecorrencia ?? this.diasSemanaRecorrencia,
    agendamentoRecorrenciaId:
        agendamentoRecorrenciaId ?? this.agendamentoRecorrenciaId,
    observacoes: observacoes ?? this.observacoes,
    googleCalendarEventId:
        googleCalendarEventId ?? this.googleCalendarEventId,
    animal: animal ?? this.animal,
    planoEstadia: planoEstadia ?? this.planoEstadia,
    pertencesDeixados: pertencesDeixados ?? this.pertencesDeixados,
  );
}
