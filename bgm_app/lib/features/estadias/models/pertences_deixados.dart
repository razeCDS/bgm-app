/// Tabela `pertences_deixados` (1:1 com `agendamentos`).
///
/// So se aplica a agendamentos de Hotel ou Creche.
class PertencesDeixados {
  const PertencesDeixados({
    this.id,
    this.agendamentoId,
    this.temCaminha,
    this.corCaminha,
    this.temRoupa,
    this.corRoupa,
    this.temBrinquedo,
    this.qualBrinquedo,
    this.racao,
    this.quantidade,
    this.vezes,
    this.observacoes,
  });

  final String? id;
  final String? agendamentoId;
  final bool? temCaminha;
  final String? corCaminha;
  final bool? temRoupa;
  final String? corRoupa;
  final bool? temBrinquedo;
  final String? qualBrinquedo;
  final String? racao;
  final String? quantidade;
  final String? vezes;
  final String? observacoes;

  factory PertencesDeixados.fromJson(Map<String, dynamic> json) =>
      PertencesDeixados(
        id: json['id'] as String?,
        agendamentoId: json['agendamento_id'] as String?,
        temCaminha: json['tem_caminha'] as bool?,
        corCaminha: json['cor_caminha'] as String?,
        temRoupa: json['tem_roupa'] as bool?,
        corRoupa: json['cor_roupa'] as String?,
        temBrinquedo: json['tem_brinquedo'] as bool?,
        qualBrinquedo: json['qual_brinquedo'] as String?,
        racao: json['racao'] as String?,
        quantidade: json['quantidade'] as String?,
        vezes: json['vezes'] as String?,
        observacoes: json['observacoes'] as String?,
      );

  Map<String, dynamic> toJson() => {
    if (agendamentoId != null) 'agendamento_id': agendamentoId,
    'tem_caminha': temCaminha,
    'cor_caminha': corCaminha,
    'tem_roupa': temRoupa,
    'cor_roupa': corRoupa,
    'tem_brinquedo': temBrinquedo,
    'qual_brinquedo': qualBrinquedo,
    'racao': racao,
    'quantidade': quantidade,
    'vezes': vezes,
    'observacoes': observacoes,
  };

  PertencesDeixados copyWith({
    String? id,
    String? agendamentoId,
    bool? temCaminha,
    String? corCaminha,
    bool? temRoupa,
    String? corRoupa,
    bool? temBrinquedo,
    String? qualBrinquedo,
    String? racao,
    String? quantidade,
    String? vezes,
    String? observacoes,
  }) => PertencesDeixados(
    id: id ?? this.id,
    agendamentoId: agendamentoId ?? this.agendamentoId,
    temCaminha: temCaminha ?? this.temCaminha,
    corCaminha: corCaminha ?? this.corCaminha,
    temRoupa: temRoupa ?? this.temRoupa,
    corRoupa: corRoupa ?? this.corRoupa,
    temBrinquedo: temBrinquedo ?? this.temBrinquedo,
    qualBrinquedo: qualBrinquedo ?? this.qualBrinquedo,
    racao: racao ?? this.racao,
    quantidade: quantidade ?? this.quantidade,
    vezes: vezes ?? this.vezes,
    observacoes: observacoes ?? this.observacoes,
  );

  bool get vazio =>
      (temCaminha ?? false) == false &&
      (temRoupa ?? false) == false &&
      (temBrinquedo ?? false) == false &&
      (racao ?? '').isEmpty &&
      (observacoes ?? '').isEmpty;
}
