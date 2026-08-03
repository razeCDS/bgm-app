import 'package:intl/intl.dart';

/// Formatadores pt_BR usados em todo o app.
abstract final class Formatadores {
  static const String _local = 'pt_BR';

  static final DateFormat data = DateFormat('dd/MM/yyyy', _local);
  static final DateFormat dataHora = DateFormat('dd/MM/yyyy HH:mm', _local);
  static final DateFormat hora = DateFormat('HH:mm', _local);
  static final DateFormat diaMesCurto = DateFormat("dd 'de' MMM", _local);
  static final NumberFormat moeda = NumberFormat.currency(
    locale: _local,
    symbol: 'R\$',
  );

  static String? dataOuNulo(DateTime? valor) =>
      valor == null ? null : data.format(valor);

  static String dataHoraOuTraco(DateTime? valor) =>
      valor == null ? '—' : dataHora.format(valor);

  static String moedaOuTraco(num? valor) =>
      valor == null ? '—' : moeda.format(valor);

  /// Formata o intervalo de um agendamento de forma compacta.
  ///
  /// A data final e opcional no banco, entao o fim pode nao existir.
  static String intervalo(DateTime inicio, DateTime? fim) {
    if (fim == null) return dataHora.format(inicio);
    final mesmoDia =
        inicio.year == fim.year &&
        inicio.month == fim.month &&
        inicio.day == fim.day;
    if (mesmoDia) {
      return '${dataHora.format(inicio)} — ${hora.format(fim)}';
    }
    return '${dataHora.format(inicio)} — ${dataHora.format(fim)}';
  }
}
