/// Tabela `termos_consentimento` (1:1 com `animais`).
///
/// Regra de negocio: os itens do termo (vacinas, vermifugo, antipulgas,
/// castracao) sao apenas conferencia manual da equipe. Este registro
/// **nunca** bloqueia a criacao de um agendamento.
class TermoConsentimento {
  const TermoConsentimento({
    required this.id,
    required this.animalId,
    this.aceito,
    this.dataAceite,
    this.localAceite,
  });

  final String id;
  final String animalId;
  final bool? aceito;
  final DateTime? dataAceite;
  final String? localAceite;

  factory TermoConsentimento.fromJson(Map<String, dynamic> json) =>
      TermoConsentimento(
        id: json['id'] as String,
        animalId: json['animal_id'] as String,
        aceito: json['aceito'] as bool?,
        dataAceite: json['data_aceite'] == null
            ? null
            : DateTime.tryParse(json['data_aceite'] as String),
        localAceite: json['local_aceite'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'animal_id': animalId,
    'aceito': aceito,
    'data_aceite': dataAceite?.toIso8601String(),
    'local_aceite': localAceite,
  };

  TermoConsentimento copyWith({
    bool? aceito,
    DateTime? dataAceite,
    String? localAceite,
  }) => TermoConsentimento(
    id: id,
    animalId: animalId,
    aceito: aceito ?? this.aceito,
    dataAceite: dataAceite ?? this.dataAceite,
    localAceite: localAceite ?? this.localAceite,
  );
}
