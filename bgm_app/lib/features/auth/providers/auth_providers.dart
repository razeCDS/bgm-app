import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';

/// Implementacao ativa da autenticacao.
///
/// Para ligar o Supabase Auth, troque por:
/// `SupabaseAuthRepository(Supabase.instance.client.auth)`.
final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => FakeAuthRepository(),
);

/// Usuario autenticado (ou `null`). O router observa este provider.
final sessaoProvider = NotifierProvider<SessaoNotifier, Usuario?>(
  SessaoNotifier.new,
);

class SessaoNotifier extends Notifier<Usuario?> {
  @override
  Usuario? build() => ref.read(authRepositoryProvider).usuarioAtual;

  Future<void> entrar({required String email, required String senha}) async {
    final repo = ref.read(authRepositoryProvider);
    state = await repo.entrar(email: email, senha: senha);
  }

  Future<void> sair() async {
    await ref.read(authRepositoryProvider).sair();
    state = null;
  }
}
