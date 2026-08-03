/// Tabela `contatos_emergencia` (1:N com `animais`).
class ContatoEmergencia {
  const ContatoEmergencia({
    required this.id,
    required this.animalId,
    this.nome,
    this.parentesco,
    this.telefone,
    this.ordem,
  });

  final String id;
  final String animalId;
  final String? nome;
  final String? parentesco;
  final String? telefone;
  final int? ordem;

  factory ContatoEmergencia.fromJson(Map<String, dynamic> json) =>
      ContatoEmergencia(
        id: json['id'] as String,
        animalId: json['animal_id'] as String,
        nome: json['nome'] as String?,
        parentesco: json['parentesco'] as String?,
        telefone: json['telefone'] as String?,
        ordem: json['ordem'] as int?,
      );

  Map<String, dynamic> toJson() => {
    'animal_id': animalId,
    'nome': nome,
    'parentesco': parentesco,
    'telefone': telefone,
    'ordem': ordem,
  };

  ContatoEmergencia copyWith({
    String? nome,
    String? parentesco,
    String? telefone,
    int? ordem,
  }) => ContatoEmergencia(
    id: id,
    animalId: animalId,
    nome: nome ?? this.nome,
    parentesco: parentesco ?? this.parentesco,
    telefone: telefone ?? this.telefone,
    ordem: ordem ?? this.ordem,
  );
}
