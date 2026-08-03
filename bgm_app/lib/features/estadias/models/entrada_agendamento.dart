import 'agendamento.dart';
import 'enums.dart';
import 'pertences_deixados.dart';
import 'plano_estadia.dart';

/// Dados de entrada para criar/editar um agendamento.
///
/// Agrupa o agendamento e seus relacionamentos 1:1, que sao gravados juntos.
class EntradaAgendamento {
  const EntradaAgendamento({
    required this.animalId,
    required this.tipo,
    required this.dataHoraInicio,
    required this.status,
    this.dataHoraFim,
    this.recorrente = false,
    this.diasSemanaRecorrencia = const [],
    this.observacoes,
    this.planoEstadia,
    this.pertencesDeixados,
  });

  final String animalId;
  final TipoAgendamento tipo;
  final DateTime dataHoraInicio;
  final DateTime? dataHoraFim;
  final StatusAgendamento status;
  final bool recorrente;
  final List<DiaSemana> diasSemanaRecorrencia;
  final String? observacoes;
  final PlanoEstadia? planoEstadia;
  final PertencesDeixados? pertencesDeixados;

  /// Deve gerar uma serie de ocorrencias via RPC.
  bool get geraRecorrencia =>
      recorrente && tipo.permiteRecorrencia && diasSemanaRecorrencia.isNotEmpty;

  factory EntradaAgendamento.de(Agendamento a) => EntradaAgendamento(
    animalId: a.animalId,
    tipo: a.tipo,
    dataHoraInicio: a.dataHoraInicio,
    dataHoraFim: a.dataHoraFim,
    status: a.status,
    recorrente: a.recorrente,
    diasSemanaRecorrencia: a.diasSemanaRecorrencia,
    observacoes: a.observacoes,
    planoEstadia: a.planoEstadia,
    pertencesDeixados: a.pertencesDeixados,
  );

  EntradaAgendamento copyWith({
    String? animalId,
    TipoAgendamento? tipo,
    DateTime? dataHoraInicio,
    DateTime? dataHoraFim,
    bool limparDataFim = false,
    StatusAgendamento? status,
    bool? recorrente,
    List<DiaSemana>? diasSemanaRecorrencia,
    String? observacoes,
    PlanoEstadia? planoEstadia,
    bool limparPlano = false,
    PertencesDeixados? pertencesDeixados,
    bool limparPertences = false,
  }) => EntradaAgendamento(
    animalId: animalId ?? this.animalId,
    tipo: tipo ?? this.tipo,
    dataHoraInicio: dataHoraInicio ?? this.dataHoraInicio,
    dataHoraFim: limparDataFim ? null : (dataHoraFim ?? this.dataHoraFim),
    status: status ?? this.status,
    recorrente: recorrente ?? this.recorrente,
    diasSemanaRecorrencia:
        diasSemanaRecorrencia ?? this.diasSemanaRecorrencia,
    observacoes: observacoes ?? this.observacoes,
    planoEstadia: limparPlano ? null : (planoEstadia ?? this.planoEstadia),
    pertencesDeixados: limparPertences
        ? null
        : (pertencesDeixados ?? this.pertencesDeixados),
  );
}

/// Erro de regra de negocio, exibido ao usuario como mensagem amigavel.
class ErroValidacao implements Exception {
  const ErroValidacao(this.mensagem);
  final String mensagem;

  @override
  String toString() => mensagem;
}

/// Regras de negocio do agendamento, portadas da API .NET.
///
/// O Termo de Consentimento **nao** entra aqui de proposito: seus itens sao
/// conferencia manual da equipe e nunca bloqueiam um agendamento.
abstract final class ValidacaoAgendamento {
  /// Retorna a mensagem do primeiro erro encontrado, ou `null` se valido.
  static String? validar(EntradaAgendamento e) {
    if (e.animalId.isEmpty) {
      return 'Selecione o animal.';
    }

    if (e.dataHoraFim != null && e.dataHoraFim!.isBefore(e.dataHoraInicio)) {
      return 'A data/hora final nao pode ser anterior a inicial.';
    }

    // Plano de estadia (rotina diaria) e obrigatorio apenas na Creche.
    // O Hotel pode ter apenas o valor da estadia — ou nem isso.
    if (e.tipo.exigePlanoEstadia && e.planoEstadia == null) {
      return 'Plano de estadia e obrigatorio para ${e.tipo.rotulo}.';
    }

    // Visita nao registra estadia.
    if (!e.tipo.temEstadia) {
      if (e.planoEstadia != null) {
        return 'Agendamento do tipo Visita nao possui plano de estadia.';
      }
      if (e.pertencesDeixados != null) {
        return 'Agendamento do tipo Visita nao possui pertences deixados.';
      }
    }

    // Recorrencia: exclusiva de Creche.
    if (e.recorrente) {
      if (!e.tipo.permiteRecorrencia) {
        return 'Recorrencia so e permitida para agendamentos de Creche.';
      }
      if (e.diasSemanaRecorrencia.isEmpty) {
        return 'Informe ao menos um dia da semana para a recorrencia.';
      }
      if (e.dataHoraFim == null) {
        return 'Informe a data final do periodo da recorrencia.';
      }
    }

    return null;
  }

  static void garantirValido(EntradaAgendamento e) {
    final erro = validar(e);
    if (erro != null) throw ErroValidacao(erro);
  }
}
