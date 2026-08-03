/// Credenciais do Supabase.
///
/// Os valores chegam por `--dart-define` para nao versionar chave no repo:
///
/// ```
/// flutter run \
///   --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///   --dart-define=SUPABASE_ANON_KEY=sb_publishable_xxx
/// ```
///
/// Enquanto [configurado] for `false`, o app roda com os repositorios em
/// memoria (dados de exemplo) — a integracao real e plugada trocando o
/// override em `lib/features/estadias/providers/estadias_providers.dart`.
abstract final class SupabaseConfig {
  static const String url = String.fromEnvironment('SUPABASE_URL');

  static const String anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get configurado => url.isNotEmpty && anonKey.isNotEmpty;
}
