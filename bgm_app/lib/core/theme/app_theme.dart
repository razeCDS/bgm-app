import 'package:flutter/material.dart';

import 'app_cores.dart';

/// Tema global do app, construido sobre a paleta de [AppCores].
abstract final class AppTheme {
  static ThemeData get tema {
    final esquema = ColorScheme.fromSeed(
      seedColor: AppCores.primaria,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppCores.primaria,
      onPrimary: AppCores.branco,
      secondary: AppCores.acento,
      onSecondary: AppCores.textoEscuro,
      surface: AppCores.branco,
      onSurface: AppCores.textoEscuro,
      surfaceContainerHighest: AppCores.neutraClara,
      error: AppCores.erro,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: esquema,
      scaffoldBackgroundColor: AppCores.branco,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppCores.primaria,
        foregroundColor: AppCores.branco,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: AppCores.branco,
          fontSize: 20,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: AppCores.branco,
        elevation: 1,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppCores.neutra, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppCores.primaria,
          foregroundColor: AppCores.branco,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppCores.primaria,
          side: const BorderSide(color: AppCores.primaria),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppCores.primaria),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppCores.acento,
        foregroundColor: AppCores.textoEscuro,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppCores.neutraClara,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppCores.primaria, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppCores.erro),
        ),
        labelStyle: const TextStyle(color: AppCores.textoSuave),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppCores.neutraClara,
        selectedColor: AppCores.primaria,
        labelStyle: const TextStyle(fontSize: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        side: BorderSide.none,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: AppCores.branco,
        unselectedLabelColor: Color(0xCCFFFFFF),
        indicatorColor: AppCores.acento,
        indicatorSize: TabBarIndicatorSize.tab,
        labelStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      dividerTheme: const DividerThemeData(
        color: AppCores.neutra,
        thickness: 0.5,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppCores.primariaEscura,
        contentTextStyle: const TextStyle(color: AppCores.branco),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
}
