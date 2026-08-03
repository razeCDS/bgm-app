import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_providers.dart';
import '../../features/auth/ui/tela_login.dart';
import '../../features/estadias/ui/agendamentos/tela_form_agendamento.dart';
import '../../features/estadias/ui/caes/tela_ficha_animal.dart';
import '../../features/estadias/ui/caes/tela_form_animal.dart';
import '../../features/estadias/ui/tela_estadias.dart';
import '../../features/home/ui/tela_modulos.dart';

abstract final class Rotas {
  static const login = '/login';
  static const inicio = '/';
  static const estadias = '/estadias';
  static const novoAgendamento = '/estadias/agendamento/novo';
  static const editarAgendamento = '/estadias/agendamento/:id';
  static const novoAnimal = '/estadias/animal/novo';
  static const fichaAnimal = '/estadias/animal/:id';
  static const editarAnimal = '/estadias/animal/:id/editar';
}

final routerProvider = Provider<GoRouter>((ref) {
  final notificador = _NotificadorSessao();
  ref.listen(sessaoProvider, (_, _) => notificador.notificar());
  ref.onDispose(notificador.dispose);

  return GoRouter(
    initialLocation: Rotas.inicio,
    refreshListenable: notificador,
    redirect: (context, estado) {
      final autenticado = ref.read(sessaoProvider) != null;
      final indoParaLogin = estado.matchedLocation == Rotas.login;

      if (!autenticado) return indoParaLogin ? null : Rotas.login;
      if (indoParaLogin) return Rotas.inicio;
      return null;
    },
    routes: [
      GoRoute(
        path: Rotas.login,
        builder: (context, estado) => const TelaLogin(),
      ),
      GoRoute(
        path: Rotas.inicio,
        builder: (context, estado) => const TelaModulos(),
        routes: [
          GoRoute(
            path: 'estadias',
            builder: (context, estado) => const TelaEstadias(),
            routes: [
              GoRoute(
                path: 'agendamento/novo',
                builder: (context, estado) => const TelaFormAgendamento(),
              ),
              GoRoute(
                path: 'agendamento/:id',
                builder: (context, estado) => TelaFormAgendamento(
                  agendamentoId: estado.pathParameters['id'],
                ),
              ),
              GoRoute(
                path: 'animal/novo',
                builder: (context, estado) => const TelaFormAnimal(),
              ),
              GoRoute(
                path: 'animal/:id',
                builder: (context, estado) => TelaFichaAnimal(
                  animalId: estado.pathParameters['id']!,
                ),
                routes: [
                  GoRoute(
                    path: 'editar',
                    builder: (context, estado) => TelaFormAnimal(
                      animalId: estado.pathParameters['id'],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

/// Ponte entre o Riverpod e o `refreshListenable` do go_router.
class _NotificadorSessao extends ChangeNotifier {
  void notificar() => notifyListeners();
}
