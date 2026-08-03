import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/supabase_config.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Formatacao de datas/moeda em pt_BR.
  await initializeDateFormatting('pt_BR');

  // O Supabase so e inicializado quando as credenciais chegam por
  // --dart-define. Sem elas, o app roda com os repositorios em memoria.
  if (SupabaseConfig.configurado) {
    await Supabase.initialize(
      url: SupabaseConfig.url,
      // Chave publicavel (`sb_publishable_...`) — quem protege os dados e a RLS.
      publishableKey: SupabaseConfig.anonKey,
    );
  }

  runApp(const ProviderScope(child: BgmApp()));
}

class BgmApp extends ConsumerWidget {
  const BgmApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'BGM Gestão Interna',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.tema,
      routerConfig: ref.watch(routerProvider),
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
