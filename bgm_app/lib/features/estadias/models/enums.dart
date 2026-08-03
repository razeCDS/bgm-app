/// Enums espelhando os tipos `enum` do Postgres.
///
/// O campo [valor] e exatamente a string aceita pelo banco; [rotulo] e o texto
/// exibido na UI. Nunca envie [rotulo] para o Supabase.
library;

enum PorteAnimal {
  mini('mini', 'Mini'),
  pequeno('pequeno', 'Pequeno'),
  medio('medio', 'Médio'),
  grande('grande', 'Grande');

  const PorteAnimal(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  static PorteAnimal? porValor(String? v) =>
      v == null ? null : PorteAnimal.values.where((e) => e.valor == v).firstOrNull;
}

enum EspecieAnimal {
  canina('canina', 'Canina'),
  felina('felina', 'Felina');

  const EspecieAnimal(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  static EspecieAnimal? porValor(String? v) => v == null
      ? null
      : EspecieAnimal.values.where((e) => e.valor == v).firstOrNull;
}

enum SexoAnimal {
  femea('femea', 'Fêmea'),
  macho('macho', 'Macho');

  const SexoAnimal(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  static SexoAnimal? porValor(String? v) =>
      v == null ? null : SexoAnimal.values.where((e) => e.valor == v).firstOrNull;
}

enum TipoAgendamento {
  visita('visita', 'Visita'),
  hotel('hotel', 'Hotel'),
  creche('creche', 'Creche');

  const TipoAgendamento(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  /// O plano de estadia descreve a **rotina diaria** (tipo de plano, total de
  /// dias, horarios de entrada/saida) e so faz sentido na Creche.
  ///
  /// No Hotel a entrada e a saida sao o proprio periodo do agendamento, entao
  /// nao ha plano — apenas o valor da estadia.
  bool get exigePlanoEstadia => this == TipoAgendamento.creche;

  /// Hotel e Creche sao estadias: registram valor e pertences deixados.
  /// Visita nao tem nenhum dos dois.
  bool get temEstadia => this != TipoAgendamento.visita;

  /// Recorrencia so existe para Creche.
  bool get permiteRecorrencia => this == TipoAgendamento.creche;

  static TipoAgendamento? porValor(String? v) => v == null
      ? null
      : TipoAgendamento.values.where((e) => e.valor == v).firstOrNull;
}

enum StatusAgendamento {
  solicitado('solicitado', 'Solicitado'),
  confirmado('confirmado', 'Confirmado'),
  emAndamento('em_andamento', 'Em andamento'),
  concluido('concluido', 'Concluído'),
  cancelado('cancelado', 'Cancelado');

  const StatusAgendamento(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  bool get estaCancelado => this == StatusAgendamento.cancelado;

  static StatusAgendamento? porValor(String? v) => v == null
      ? null
      : StatusAgendamento.values.where((e) => e.valor == v).firstOrNull;
}

enum TipoPlano {
  diaria('diaria', 'Diária'),
  semanal('semanal', 'Semanal'),
  mensal('mensal', 'Mensal'),
  anual('anual', 'Anual');

  const TipoPlano(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  static TipoPlano? porValor(String? v) =>
      v == null ? null : TipoPlano.values.where((e) => e.valor == v).firstOrNull;
}

enum FormaPagamento {
  pix('pix', 'Pix'),
  dinheiro('dinheiro', 'Dinheiro');

  const FormaPagamento(this.valor, this.rotulo);
  final String valor;
  final String rotulo;

  static FormaPagamento? porValor(String? v) => v == null
      ? null
      : FormaPagamento.values.where((e) => e.valor == v).firstOrNull;
}

/// Dias da semana na convencao do Postgres (`EXTRACT(DOW)`): 0 = domingo.
///
/// Atencao: `DateTime.weekday` do Dart usa 1 = segunda ... 7 = domingo.
/// Use [deDateTime] para converter — nunca compare os dois diretamente.
enum DiaSemana {
  domingo(0, 'Domingo', 'Dom'),
  segunda(1, 'Segunda', 'Seg'),
  terca(2, 'Terça', 'Ter'),
  quarta(3, 'Quarta', 'Qua'),
  quinta(4, 'Quinta', 'Qui'),
  sexta(5, 'Sexta', 'Sex'),
  sabado(6, 'Sábado', 'Sáb');

  const DiaSemana(this.valor, this.rotulo, this.abreviado);

  /// Valor gravado em `agendamentos.dias_semana_recorrencia` (int[]).
  final int valor;
  final String rotulo;
  final String abreviado;

  static DiaSemana porValor(int v) =>
      DiaSemana.values.firstWhere((e) => e.valor == v);

  /// Converte um [DateTime] do Dart (1=segunda..7=domingo) para a
  /// convencao do Postgres (0=domingo..6=sabado).
  static DiaSemana deDateTime(DateTime data) =>
      porValor(data.weekday % 7);
}
