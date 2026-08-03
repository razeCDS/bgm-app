import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_cores.dart';
import '../../../../shared/widgets/estado_lista.dart';
import '../../models/animal.dart';
import '../../models/enums.dart';
import '../../providers/estadias_providers.dart';

class AbaCaes extends ConsumerStatefulWidget {
  const AbaCaes({super.key});

  @override
  ConsumerState<AbaCaes> createState() => _AbaCaesState();
}

class _AbaCaesState extends ConsumerState<AbaCaes> {
  final _busca = TextEditingController();

  @override
  void initState() {
    super.initState();
    _busca.text = ref.read(buscaAnimaisProvider);
  }

  @override
  void dispose() {
    _busca.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final animais = ref.watch(animaisProvider);

    return Scaffold(
      body: Column(
        children: [
          Container(
            color: AppCores.neutraClara,
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
            child: TextField(
              controller: _busca,
              onChanged: ref.read(buscaAnimaisProvider.notifier).definir,
              decoration: InputDecoration(
                hintText: 'Buscar por nome, raça ou tutor…',
                prefixIcon: const Icon(Icons.search),
                fillColor: AppCores.branco,
                suffixIcon: _busca.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _busca.clear();
                          ref.read(buscaAnimaisProvider.notifier).limpar();
                          setState(() {});
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: animais.when(
              loading: () => const CarregandoCentral(),
              error: (e, _) => EstadoErro(
                mensagem: '$e',
                aoTentarNovamente: () => ref.invalidate(animaisProvider),
              ),
              data: (lista) {
                if (lista.isEmpty) {
                  return EstadoVazio(
                    icone: Icons.pets,
                    titulo: _busca.text.isEmpty
                        ? 'Nenhum cão cadastrado'
                        : 'Nenhum resultado',
                    descricao: _busca.text.isEmpty
                        ? 'Toque em + para cadastrar o primeiro cliente.'
                        : 'Tente outro termo de busca.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(animaisProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
                    itemCount: lista.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) =>
                        _CardAnimal(animal: lista[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/estadias/animal/novo'),
        icon: const Icon(Icons.add),
        label: const Text('Novo cliente'),
      ),
    );
  }
}

class _CardAnimal extends StatelessWidget {
  const _CardAnimal({required this.animal});

  final Animal animal;

  IconData get _icone => animal.especie == EspecieAnimal.felina
      ? Icons.cruelty_free
      : Icons.pets;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/estadias/animal/${animal.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                height: 52,
                width: 52,
                decoration: BoxDecoration(
                  color: AppCores.acento.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_icone, color: AppCores.primariaEscura, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      animal.nome,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (animal.resumo.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          animal.resumo,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppCores.textoSuave,
                          ),
                        ),
                      ),
                    if (animal.tutor != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.person_outline,
                              size: 14,
                              color: AppCores.textoSuave,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                animal.tutor!.nomeCompleto,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppCores.textoSuave,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppCores.neutra),
            ],
          ),
        ),
      ),
    );
  }
}
