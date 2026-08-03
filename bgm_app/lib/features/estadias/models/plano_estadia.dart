import 'package:flutter/material.dart';

import 'enums.dart';

/// Tabela `planos_estadia` (1:1 com `agendamentos`).
///
/// So se aplica a agendamentos de Hotel ou Creche.
class PlanoEstadia {
  const PlanoEstadia({
    this.id,
    this.agendamentoId,
    this.tipoPlano,
    this.totalDias,
    this.horarioEntrada,
    this.horarioSaida,
    this.formaPagamento,
    this.valorTotal,
  });

  final String? id;
  final String? agendamentoId;
  final TipoPlano? tipoPlano;
  final int? totalDias;
  final TimeOfDay? horarioEntrada;
  final TimeOfDay? horarioSaida;
  final FormaPagamento? formaPagamento;

  /// Campo informativo — nao ha processamento de pagamento nesta fase.
  final num? valorTotal;

  /// Converte `time` do Postgres ("08:00:00") para [TimeOfDay].
  static TimeOfDay? horaDeTexto(Object? v) {
    if (v == null) return null;
    final partes = '$v'.split(':');
    if (partes.length < 2) return null;
    final h = int.tryParse(partes[0]);
    final m = int.tryParse(partes[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  static String? horaParaTexto(TimeOfDay? v) => v == null
      ? null
      : '${v.hour.toString().padLeft(2, '0')}:'
            '${v.minute.toString().padLeft(2, '0')}:00';

  factory PlanoEstadia.fromJson(Map<String, dynamic> json) => PlanoEstadia(
    id: json['id'] as String?,
    agendamentoId: json['agendamento_id'] as String?,
    tipoPlano: TipoPlano.porValor(json['tipo_plano'] as String?),
    totalDias: json['total_dias'] as int?,
    horarioEntrada: horaDeTexto(json['horario_entrada']),
    horarioSaida: horaDeTexto(json['horario_saida']),
    formaPagamento: FormaPagamento.porValor(json['forma_pagamento'] as String?),
    valorTotal: json['valor_total'] as num?,
  );

  Map<String, dynamic> toJson() => {
    if (agendamentoId != null) 'agendamento_id': agendamentoId,
    'tipo_plano': tipoPlano?.valor,
    'total_dias': totalDias,
    'horario_entrada': horaParaTexto(horarioEntrada),
    'horario_saida': horaParaTexto(horarioSaida),
    'forma_pagamento': formaPagamento?.valor,
    'valor_total': valorTotal,
  };

  PlanoEstadia copyWith({
    String? id,
    String? agendamentoId,
    TipoPlano? tipoPlano,
    int? totalDias,
    TimeOfDay? horarioEntrada,
    TimeOfDay? horarioSaida,
    FormaPagamento? formaPagamento,
    num? valorTotal,
  }) => PlanoEstadia(
    id: id ?? this.id,
    agendamentoId: agendamentoId ?? this.agendamentoId,
    tipoPlano: tipoPlano ?? this.tipoPlano,
    totalDias: totalDias ?? this.totalDias,
    horarioEntrada: horarioEntrada ?? this.horarioEntrada,
    horarioSaida: horarioSaida ?? this.horarioSaida,
    formaPagamento: formaPagamento ?? this.formaPagamento,
    valorTotal: valorTotal ?? this.valorTotal,
  );
}
