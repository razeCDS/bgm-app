import 'package:flutter/material.dart';

/// Paleta oficial do BGM Daycare.
///
/// Estes sao os unicos literais de cor do app: qualquer tela deve consumir
/// daqui (ou do [Theme.of]) em vez de declarar `Color(0x...)` inline.
abstract final class AppCores {
  /// Verde escuro — cor primaria (AppBar, botoes, destaques).
  static const Color primaria = Color(0xFF46715C);

  /// Rosa terracota — cor de acento (badges, icones, chips de status).
  static const Color acento = Color(0xFFDCA899);

  /// Verde-acinzentado — fundos neutros e superficies secundarias.
  static const Color neutra = Color(0xFFADB4AB);

  /// Branco — fundo principal e texto sobre cor escura.
  static const Color branco = Color(0xFFFFFFFF);

  // ── Variacoes derivadas ────────────────────────────────────────────────
  static const Color primariaEscura = Color(0xFF35543F);
  static const Color primariaClara = Color(0xFF6B9280);
  static const Color neutraClara = Color(0xFFEDEFEC);
  static const Color textoEscuro = Color(0xFF1F2B24);
  static const Color textoSuave = Color(0xFF5F6B63);
  static const Color erro = Color(0xFFB3261E);
}
