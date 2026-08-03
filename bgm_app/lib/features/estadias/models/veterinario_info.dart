/// Tabela `veterinarios_info` (1:1 com `animais`).
class VeterinarioInfo {
  const VeterinarioInfo({
    required this.id,
    required this.animalId,
    this.nomeVeterinario,
    this.temEspecialidade,
    this.qualEspecialidade,
    this.telefoneVeterinario,
    this.nomeClinica,
    this.telefoneClinica,
    this.enderecoClinica,
  });

  final String id;
  final String animalId;
  final String? nomeVeterinario;
  final bool? temEspecialidade;
  final String? qualEspecialidade;
  final String? telefoneVeterinario;
  final String? nomeClinica;
  final String? telefoneClinica;
  final String? enderecoClinica;

  factory VeterinarioInfo.fromJson(Map<String, dynamic> json) =>
      VeterinarioInfo(
        id: json['id'] as String,
        animalId: json['animal_id'] as String,
        nomeVeterinario: json['nome_veterinario'] as String?,
        temEspecialidade: json['tem_especialidade'] as bool?,
        qualEspecialidade: json['qual_especialidade'] as String?,
        telefoneVeterinario: json['telefone_veterinario'] as String?,
        nomeClinica: json['nome_clinica'] as String?,
        telefoneClinica: json['telefone_clinica'] as String?,
        enderecoClinica: json['endereco_clinica'] as String?,
      );

  Map<String, dynamic> toJson() => {
    'animal_id': animalId,
    'nome_veterinario': nomeVeterinario,
    'tem_especialidade': temEspecialidade,
    'qual_especialidade': qualEspecialidade,
    'telefone_veterinario': telefoneVeterinario,
    'nome_clinica': nomeClinica,
    'telefone_clinica': telefoneClinica,
    'endereco_clinica': enderecoClinica,
  };

  VeterinarioInfo copyWith({
    String? nomeVeterinario,
    bool? temEspecialidade,
    String? qualEspecialidade,
    String? telefoneVeterinario,
    String? nomeClinica,
    String? telefoneClinica,
    String? enderecoClinica,
  }) => VeterinarioInfo(
    id: id,
    animalId: animalId,
    nomeVeterinario: nomeVeterinario ?? this.nomeVeterinario,
    temEspecialidade: temEspecialidade ?? this.temEspecialidade,
    qualEspecialidade: qualEspecialidade ?? this.qualEspecialidade,
    telefoneVeterinario: telefoneVeterinario ?? this.telefoneVeterinario,
    nomeClinica: nomeClinica ?? this.nomeClinica,
    telefoneClinica: telefoneClinica ?? this.telefoneClinica,
    enderecoClinica: enderecoClinica ?? this.enderecoClinica,
  );
}
