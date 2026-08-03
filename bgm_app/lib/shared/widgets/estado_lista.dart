import 'package:flutter/material.dart';

import '../../core/theme/app_cores.dart';

/// Placeholder de lista vazia.
class EstadoVazio extends StatelessWidget {
  const EstadoVazio({
    super.key,
    required this.icone,
    required this.titulo,
    this.descricao,
    this.acao,
  });

  final IconData icone;
  final String titulo;
  final String? descricao;
  final Widget? acao;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icone, size: 56, color: AppCores.neutra),
            const SizedBox(height: 16),
            Text(
              titulo,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: AppCores.textoEscuro,
              ),
            ),
            if (descricao != null) ...[
              const SizedBox(height: 6),
              Text(
                descricao!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppCores.textoSuave),
              ),
            ],
            if (acao != null) ...[const SizedBox(height: 20), acao!],
          ],
        ),
      ),
    );
  }
}

/// Placeholder de erro com opcao de tentar novamente.
class EstadoErro extends StatelessWidget {
  const EstadoErro({super.key, required this.mensagem, this.aoTentarNovamente});

  final String mensagem;
  final VoidCallback? aoTentarNovamente;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 52, color: AppCores.erro),
            const SizedBox(height: 14),
            const Text(
              'Algo deu errado',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Text(
              mensagem,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppCores.textoSuave),
            ),
            if (aoTentarNovamente != null) ...[
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: aoTentarNovamente,
                icon: const Icon(Icons.refresh),
                label: const Text('Tentar novamente'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CarregandoCentral extends StatelessWidget {
  const CarregandoCentral({super.key});

  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator());
}
