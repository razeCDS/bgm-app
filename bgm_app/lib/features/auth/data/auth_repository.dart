import 'package:supabase_flutter/supabase_flutter.dart' as sb;

/// Usuario autenticado no app.
class Usuario {
  const Usuario({required this.id, required this.email});
  final String id;
  final String email;
}

class ErroAutenticacao implements Exception {
  const ErroAutenticacao(this.mensagem);
  final String mensagem;

  @override
  String toString() => mensagem;
}

abstract interface class AuthRepository {
  Usuario? get usuarioAtual;
  Future<Usuario> entrar({required String email, required String senha});
  Future<void> sair();
}

/// Autenticacao de desenvolvimento: aceita qualquer credencial valida no
/// formato, sem consultar servidor.
///
/// Existe apenas enquanto a integracao com o Supabase Auth nao esta ligada.
/// A troca para [SupabaseAuthRepository] nao exige mudanca nas telas.
class FakeAuthRepository implements AuthRepository {
  Usuario? _usuario;

  @override
  Usuario? get usuarioAtual => _usuario;

  @override
  Future<Usuario> entrar({
    required String email,
    required String senha,
  }) async {
    await Future.delayed(const Duration(milliseconds: 400));
    if (!email.contains('@')) {
      throw const ErroAutenticacao('Informe um e-mail valido.');
    }
    if (senha.length < 4) {
      throw const ErroAutenticacao(
        'A senha deve ter ao menos 4 caracteres.',
      );
    }
    return _usuario = Usuario(id: 'dev-local', email: email);
  }

  @override
  Future<void> sair() async {
    await Future.delayed(const Duration(milliseconds: 150));
    _usuario = null;
  }
}

/// Autenticacao real via Supabase Auth (e-mail/senha).
///
/// Nao ha auto-cadastro: os usuarios sao criados manualmente no painel.
class SupabaseAuthRepository implements AuthRepository {
  SupabaseAuthRepository(this._auth);

  final sb.GoTrueClient _auth;

  Usuario? _de(sb.User? u) =>
      u == null ? null : Usuario(id: u.id, email: u.email ?? '');

  @override
  Usuario? get usuarioAtual => _de(_auth.currentUser);

  @override
  Future<Usuario> entrar({
    required String email,
    required String senha,
  }) async {
    try {
      final resposta = await _auth.signInWithPassword(
        email: email,
        password: senha,
      );
      final usuario = _de(resposta.user);
      if (usuario == null) {
        throw const ErroAutenticacao('Nao foi possivel entrar.');
      }
      return usuario;
    } on sb.AuthException catch (e) {
      throw ErroAutenticacao(e.message);
    }
  }

  @override
  Future<void> sair() => _auth.signOut();
}
