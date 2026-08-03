import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/formatadores.dart';
import '../../../../core/theme/app_cores.dart';
import '../../../../shared/widgets/chip_status.dart';
import '../../../../shared/widgets/estado_lista.dart';
import '../../models/agendamento.dart';
import '../../providers/estadias_providers.dart';
import 'painel_filtros.dart';

class AbaAgendamentos extends ConsumerWidget {
  const AbaAgendamentos({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final agendamentos = ref.watch(agendamentosProvider);
    final filtro = ref.watch(filtroAgendamentosProvider);

    return Scaffold(
      body: Column(
        children: [
          const PainelFiltros(),
          Expanded(
            child: agendamentos.when(
              loading: () => const CarregandoCentral(),
              error: (e, _) => EstadoErro(
                mensagem: '$e',
                aoTentarNovamente: () =>
                    ref.invalidate(agendamentosProvider),
              ),
              data: (lista) {
                if (lista.isEmpty) {
                  return EstadoVazio(
                    icone: Icons.event_busy,
                    titulo: filtro.vazio
                        ? 'Nenhum agendamento'
                        : 'Nenhum resultado para os filtros',
                    descricao: filtro.vazio
                        ? 'Toque em + para criar o primeiro agendamento.'
                        : 'Ajuste ou limpe os filtros para ver mais.',
                    acao: filtro.vazio
                        ? null
                        : OutlinedButton(
                            onPressed: ref
                                .read(filtroAgendamentosProvider.notifier)
                                .limparTudo,
                            child: const Text('Limpar filtros'),
                          ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(agendamentosProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 88),
                    itemCount: lista.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) =>
                        _CardAgendamento(agendamento: lista[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/estadias/agendamento/novo'),
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
    );
  }
}

class _CardAgendamento extends ConsumerWidget {
  const _CardAgendamento({required this.agendamento});

  final Agendamento agendamento;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final animal = agendamento.animal;
    final cancelado = agendamento.status.estaCancelado;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/estadias/agendamento/${agendamento.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      animal?.nome ?? 'Animal',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: cancelado
                            ? AppCores.textoSuave
                            : AppCores.textoEscuro,
                        decoration: cancelado
                            ? TextDecoration.lineThrough
                            : null,
                      ),
                    ),
                  ),
                  ChipStatus(agendamento.status),
                ],
              ),
              if (animal?.tutor != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    'Tutor: ${animal!.tutor!.nomeCompleto}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppCores.textoSuave,
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  ChipTipo(agendamento.tipo),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.schedule,
                          size: 15,
                          color: AppCores.textoSuave,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            Formatadores.intervalo(
                              agendamento.dataHoraInicio,
                              agendamento.dataHoraFim,
                            ),
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
              if (agendamento.pertenceASerie ||
                  agendamento.planoEstadia?.valorTotal != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (agendamento.pertenceASerie) ...[
                      const Icon(
                        Icons.repeat,
                        size: 15,
                        color: AppCores.primaria,
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Série recorrente',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppCores.primaria,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (agendamento.planoEstadia?.valorTotal != null)
                      Text(
                        Formatadores.moedaOuTraco(
                          agendamento.planoEstadia!.valorTotal,
                        ),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppCores.primariaEscura,
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
