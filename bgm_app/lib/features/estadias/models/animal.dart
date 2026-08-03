import 'enums.dart';
import 'tutor.dart';

/// Tabela `animais`.
class Animal {
  const Animal({
    required this.id,
    required this.tutorId,
    required this.nome,
    this.raca,
    this.idade,
    this.porte,
    this.peso,
    this.especie,
    this.sexo,
    this.castrado,
    this.docil,
    this.observacoes,
    this.tutor,
  });

  final String id;
  final String tutorId;
  final String nome;
  final String? raca;

  /// A coluna e `text` no Postgres, mas o app trata a idade como numero:
  /// convertida na leitura e serializada de volta como string.
  final int? idade;

  final PorteAnimal? porte;
  final num? peso;
  final EspecieAnimal? especie;
  final SexoAnimal? sexo;
  final bool? castrado;
  final bool? docil;
  final String? observacoes;

  /// Preenchido quando a consulta embute `tutores(*)`.
  final Tutor? tutor;

  factory Animal.fromJson(Map<String, dynamic> json) {
    final bruto = json['tutores'];
    return Animal(
      id: json['id'] as String,
      tutorId: json['tutor_id'] as String,
      nome: json['nome'] as String,
      raca: json['raca'] as String?,
      idade: int.tryParse('${json['idade'] ?? ''}'),
      porte: PorteAnimal.porValor(json['porte'] as String?),
      peso: json['peso'] as num?,
      especie: EspecieAnimal.porValor(json['especie'] as String?),
      sexo: SexoAnimal.porValor(json['sexo'] as String?),
      castrado: json['castrado'] as bool?,
      docil: json['docil'] as bool?,
      observacoes: json['observacoes'] as String?,
      tutor: bruto is Map<String, dynamic> ? Tutor.fromJson(bruto) : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'tutor_id': tutorId,
    'nome': nome,
    'raca': raca,
    // Coluna `text`: envia o numero como string.
    'idade': idade?.toString(),
    'porte': porte?.valor,
    'peso': peso,
    'especie': especie?.valor,
    'sexo': sexo?.valor,
    'castrado': castrado,
    'docil': docil,
    'observacoes': observacoes,
  };

  Animal copyWith({
    String? id,
    String? tutorId,
    String? nome,
    String? raca,
    int? idade,
    PorteAnimal? porte,
    num? peso,
    EspecieAnimal? especie,
    SexoAnimal? sexo,
    bool? castrado,
    bool? docil,
    String? observacoes,
    Tutor? tutor,
  }) => Animal(
    id: id ?? this.id,
    tutorId: tutorId ?? this.tutorId,
    nome: nome ?? this.nome,
    raca: raca ?? this.raca,
    idade: idade ?? this.idade,
    porte: porte ?? this.porte,
    peso: peso ?? this.peso,
    especie: especie ?? this.especie,
    sexo: sexo ?? this.sexo,
    castrado: castrado ?? this.castrado,
    docil: docil ?? this.docil,
    observacoes: observacoes ?? this.observacoes,
    tutor: tutor ?? this.tutor,
  );

  /// Linha resumida usada nos cards da aba Caes.
  String get resumo => [
    if (raca != null && raca!.isNotEmpty) raca,
    if (porte != null) porte!.rotulo,
    if (idade != null) '$idade ${idade == 1 ? 'ano' : 'anos'}',
  ].whereType<String>().join(' · ');
}
