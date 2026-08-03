/// Tabela `tutores`.
class Tutor {
  const Tutor({
    required this.id,
    required this.nomeCompleto,
    this.endereco,
    this.rg,
    this.cpfCnpj,
    this.telefone,
    this.email,
  });

  final String id;
  final String nomeCompleto;
  final String? endereco;
  final String? rg;

  /// Aceita `null` no banco, mas o formulario do app exige preenchimento.
  final String? cpfCnpj;
  final String? telefone;
  final String? email;

  factory Tutor.fromJson(Map<String, dynamic> json) => Tutor(
    id: json['id'] as String,
    nomeCompleto: json['nome_completo'] as String,
    endereco: json['endereco'] as String?,
    rg: json['rg'] as String?,
    cpfCnpj: json['cpf_cnpj'] as String?,
    telefone: json['telefone'] as String?,
    email: json['email'] as String?,
  );

  /// `id` fica de fora: e gerado pelo Postgres (`gen_random_uuid()`).
  Map<String, dynamic> toJson() => {
    'nome_completo': nomeCompleto,
    'endereco': endereco,
    'rg': rg,
    'cpf_cnpj': cpfCnpj,
    'telefone': telefone,
    'email': email,
  };

  Tutor copyWith({
    String? id,
    String? nomeCompleto,
    String? endereco,
    String? rg,
    String? cpfCnpj,
    String? telefone,
    String? email,
  }) => Tutor(
    id: id ?? this.id,
    nomeCompleto: nomeCompleto ?? this.nomeCompleto,
    endereco: endereco ?? this.endereco,
    rg: rg ?? this.rg,
    cpfCnpj: cpfCnpj ?? this.cpfCnpj,
    telefone: telefone ?? this.telefone,
    email: email ?? this.email,
  );
}
