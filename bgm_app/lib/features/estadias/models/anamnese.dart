/// Tabela `anamneses` (1:1 com `animais`).
class Anamnese {
  const Anamnese({
    required this.id,
    required this.animalId,
    this.doencaPreexistente,
    this.doencaQual,
    this.alergias,
    this.cuidadosEspeciais,
    this.cuidadosQual,
    this.tomaMedicacao,
    this.medicacaoQual,
    this.vermifugadoUltimoMes,
    this.dataVermifugo,
    this.vacinadoEsteAno,
    this.dataVacinacao,
    this.observacoes,
  });

  final String id;
  final String animalId;
  final bool? doencaPreexistente;
  final String? doencaQual;
  final String? alergias;
  final bool? cuidadosEspeciais;
  final String? cuidadosQual;
  final bool? tomaMedicacao;
  final String? medicacaoQual;
  final bool? vermifugadoUltimoMes;
  final DateTime? dataVermifugo;
  final bool? vacinadoEsteAno;
  final DateTime? dataVacinacao;
  final String? observacoes;

  static DateTime? _data(Object? v) =>
      v == null ? null : DateTime.tryParse(v as String);

  /// Colunas `date`: enviadas sem a parte de hora.
  static String? _soData(DateTime? v) =>
      v?.toIso8601String().split('T').first;

  factory Anamnese.fromJson(Map<String, dynamic> json) => Anamnese(
    id: json['id'] as String,
    animalId: json['animal_id'] as String,
    doencaPreexistente: json['doenca_preexistente'] as bool?,
    doencaQual: json['doenca_qual'] as String?,
    alergias: json['alergias'] as String?,
    cuidadosEspeciais: json['cuidados_especiais'] as bool?,
    cuidadosQual: json['cuidados_qual'] as String?,
    tomaMedicacao: json['toma_medicacao'] as bool?,
    medicacaoQual: json['medicacao_qual'] as String?,
    vermifugadoUltimoMes: json['vermifugado_ultimo_mes'] as bool?,
    dataVermifugo: _data(json['data_vermifugo']),
    vacinadoEsteAno: json['vacinado_este_ano'] as bool?,
    dataVacinacao: _data(json['data_vacinacao']),
    observacoes: json['observacoes'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'animal_id': animalId,
    'doenca_preexistente': doencaPreexistente,
    'doenca_qual': doencaQual,
    'alergias': alergias,
    'cuidados_especiais': cuidadosEspeciais,
    'cuidados_qual': cuidadosQual,
    'toma_medicacao': tomaMedicacao,
    'medicacao_qual': medicacaoQual,
    'vermifugado_ultimo_mes': vermifugadoUltimoMes,
    'data_vermifugo': _soData(dataVermifugo),
    'vacinado_este_ano': vacinadoEsteAno,
    'data_vacinacao': _soData(dataVacinacao),
    'observacoes': observacoes,
  };

  Anamnese copyWith({
    bool? doencaPreexistente,
    String? doencaQual,
    String? alergias,
    bool? cuidadosEspeciais,
    String? cuidadosQual,
    bool? tomaMedicacao,
    String? medicacaoQual,
    bool? vermifugadoUltimoMes,
    DateTime? dataVermifugo,
    bool? vacinadoEsteAno,
    DateTime? dataVacinacao,
    String? observacoes,
  }) => Anamnese(
    id: id,
    animalId: animalId,
    doencaPreexistente: doencaPreexistente ?? this.doencaPreexistente,
    doencaQual: doencaQual ?? this.doencaQual,
    alergias: alergias ?? this.alergias,
    cuidadosEspeciais: cuidadosEspeciais ?? this.cuidadosEspeciais,
    cuidadosQual: cuidadosQual ?? this.cuidadosQual,
    tomaMedicacao: tomaMedicacao ?? this.tomaMedicacao,
    medicacaoQual: medicacaoQual ?? this.medicacaoQual,
    vermifugadoUltimoMes: vermifugadoUltimoMes ?? this.vermifugadoUltimoMes,
    dataVermifugo: dataVermifugo ?? this.dataVermifugo,
    vacinadoEsteAno: vacinadoEsteAno ?? this.vacinadoEsteAno,
    dataVacinacao: dataVacinacao ?? this.dataVacinacao,
    observacoes: observacoes ?? this.observacoes,
  );
}
