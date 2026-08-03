import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_cores.dart';
import '../../auth/providers/auth_providers.dart';

/// Menu inicial de modulos.
///
/// Estruturado como lista de dados para crescer sem mexer no layout:
/// basta acrescentar um [_Modulo].
class TelaModulos extends ConsumerWidget {
  const TelaModulos({super.key});

  static const _modulos = [
    _Modulo(
      titulo: 'BGM Estadias',
      icone: Icons.house,
      rota: Rotas.estadias,
    ),
    _Modulo(
      titulo: 'BGM Banho/Tosa',
      icone: Icons.water_drop,
      rota: null, // fase futura
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usuario = ref.watch(sessaoProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BGM Gestão Interna'),
        actions: [
          IconButton(
            tooltip: 'Sair',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(sessaoProvider.notifier).sair(),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (usuario != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Text(
                'Olá, ${usuario.email}',
                style: const TextStyle(color: AppCores.textoSuave),
              ),
            ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: GridView.count(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.95,
                children: [
                  for (final modulo in _modulos)
                    _CardModulo(
                      modulo: modulo,
                      aoTocar: modulo.rota == null
                          ? () => ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  '${modulo.titulo} estará disponível em '
                                  'uma próxima fase.',
                                ),
                              ),
                            )
                          : () => context.go(modulo.rota!),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Modulo {
  const _Modulo({required this.titulo, required this.icone, this.rota});

  final String titulo;
  final IconData icone;

  /// `null` significa modulo ainda nao implementado.
  final String? rota;

  bool get disponivel => rota != null;
}

class _CardModulo extends StatelessWidget {
  const _CardModulo({required this.modulo, required this.aoTocar});

  final _Modulo modulo;
  final VoidCallback aoTocar;

  @override
  Widget build(BuildContext context) {
    final ativo = modulo.disponivel;
    // O InkWell envolve o card inteiro (icone + rotulo): tocar no texto
    // tambem navega, que e o comportamento esperado pelo usuario.
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: aoTocar,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: ativo
                      ? AppCores.primaria
                      : AppCores.primaria.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        modulo.icone,
                        color: ativo
                            ? AppCores.acento
                            : AppCores.acento.withValues(alpha: 0.5),
                        size: 40,
                      ),
                    ),
                    if (!ativo)
                      const Positioned(
                        top: 8,
                        right: 8,
                        child: Text(
                          'em breve',
                          style: TextStyle(
                            color: AppCores.branco,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              modulo.titulo,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: ativo ? AppCores.textoEscuro : AppCores.textoSuave,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
