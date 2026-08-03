import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/formatadores.dart';
import '../../../../core/theme/app_cores.dart';
import '../../models/enums.dart';
import '../../models/filtro_agendamentos.dart';
import '../../providers/estadias_providers.dart';

/// Painel de filtros combinaveis da aba Agendamentos.
///
/// Todos os filtros se acumulam: animal E tutor E tipo E status E periodo.
class PainelFiltros extends ConsumerWidget {
  const PainelFiltros({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filtro = ref.watch(filtroAgendamentosProvider);
    final notifier = ref.read(filtroAgendamentosProvider.notifier);
    final animais = ref.watch(animaisProvider);
    final tutores = ref.watch(tutoresProvider);

    return Container(
      color: AppCores.neutraClara,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // ── Tipo ──
                _MenuFiltro<TipoAgendamento>(
                  rotulo: 'Tipo',
                  selecionado: filtro.tipo,
                  textoDe: (t) => t.rotulo,
                  opcoes: TipoAgendamento.values,
                  aoSelecionar: (t) => notifier.definir(
                    t == null
                        ? filtro.limparTipo()
                        : filtro.copyWith(tipo: t),
                  ),
                ),
                const SizedBox(width: 8),
                // ── Status ──
                _MenuFiltro<StatusAgendamento>(
                  rotulo: 'Status',
                  selecionado: filtro.status,
                  textoDe: (s) => s.rotulo,
                  opcoes: StatusAgendamento.values,
                  aoSelecionar: (s) => notifier.definir(
                    s == null
                        ? filtro.limparStatus()
                        : filtro.copyWith(status: s),
                  ),
                ),
                const SizedBox(width: 8),
                // ── Animal ──
                _MenuFiltro<String>(
                  rotulo: 'Animal',
                  selecionado: filtro.animalId,
                  textoDe: (id) =>
                      animais.value
                          ?.where((a) => a.id == id)
                          .firstOrNull
                          ?.nome ??
                      'Animal',
                  opcoes: animais.value?.map((a) => a.id).toList() ?? [],
                  aoSelecionar: (id) => notifier.definir(
                    id == null
                        ? filtro.limparAnimal()
                        : filtro.copyWith(animalId: id),
                  ),
                ),
                const SizedBox(width: 8),
                // ── Tutor ──
                _MenuFiltro<String>(
                  rotulo: 'Tutor',
                  selecionado: filtro.tutorId,
                  textoDe: (id) =>
                      tutores.value
                          ?.where((t) => t.id == id)
                          .firstOrNull
                          ?.nomeCompleto ??
                      'Tutor',
                  opcoes: tutores.value?.map((t) => t.id).toList() ?? [],
                  aoSelecionar: (id) => notifier.definir(
                    id == null
                        ? filtro.limparTutor()
                        : filtro.copyWith(tutorId: id),
                  ),
                ),
                const SizedBox(width: 8),
                // ── Periodo ──
                _ChipFiltro(
                  ativo: filtro.dataInicio != null || filtro.dataFim != null,
                  texto: _textoPeriodo(filtro),
                  aoTocar: () => _escolherPeriodo(context, ref, filtro),
                  aoLimpar: (filtro.dataInicio != null || filtro.dataFim != null)
                      ? () => notifier.definir(filtro.limparPeriodo())
                      : null,
                ),
              ],
            ),
          ),
          if (!filtro.vazio) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  '${filtro.quantidadeAtiva} '
                  '${filtro.quantidadeAtiva == 1 ? 'filtro ativo' : 'filtros ativos'}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppCores.textoSuave,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: notifier.limparTudo,
                  icon: const Icon(Icons.clear_all, size: 18),
                  label: const Text('Limpar tudo'),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  static String _textoPeriodo(FiltroAgendamentos f) {
    if (f.dataInicio == null && f.dataFim == null) return 'Período';
    final ini = f.dataInicio == null
        ? '…'
        : Formatadores.data.format(f.dataInicio!);
    final fim = f.dataFim == null ? '…' : Formatadores.data.format(f.dataFim!);
    return '$ini — $fim';
  }

  Future<void> _escolherPeriodo(
    BuildContext context,
    WidgetRef ref,
    FiltroAgendamentos filtro,
  ) async {
    final agora = DateTime.now();
    final intervalo = await showDateRangePicker(
      context: context,
      firstDate: DateTime(agora.year - 2),
      lastDate: DateTime(agora.year + 3),
      initialDateRange: filtro.dataInicio != null && filtro.dataFim != null
          ? DateTimeRange(start: filtro.dataInicio!, end: filtro.dataFim!)
          : null,
      locale: const Locale('pt', 'BR'),
    );
    if (intervalo == null) return;
    ref.read(filtroAgendamentosProvider.notifier).definir(
      filtro.copyWith(
        dataInicio: intervalo.start,
        // Inclui o dia final inteiro.
        dataFim: DateTime(
          intervalo.end.year,
          intervalo.end.month,
          intervalo.end.day,
          23,
          59,
          59,
        ),
      ),
    );
  }
}

class _MenuFiltro<T> extends StatelessWidget {
  const _MenuFiltro({
    required this.rotulo,
    required this.selecionado,
    required this.opcoes,
    required this.textoDe,
    required this.aoSelecionar,
  });

  final String rotulo;
  final T? selecionado;
  final List<T> opcoes;
  final String Function(T) textoDe;
  final ValueChanged<T?> aoSelecionar;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<T?>(
      onSelected: aoSelecionar,
      itemBuilder: (context) => [
        PopupMenuItem<T?>(
          value: null,
          child: Text('Todos — $rotulo'),
        ),
        const PopupMenuDivider(),
        for (final o in opcoes)
          PopupMenuItem<T?>(value: o, child: Text(textoDe(o))),
      ],
      child: _ChipFiltro(
        ativo: selecionado != null,
        texto: selecionado == null ? rotulo : textoDe(selecionado as T),
        aoLimpar: selecionado == null ? null : () => aoSelecionar(null),
      ),
    );
  }
}

class _ChipFiltro extends StatelessWidget {
  const _ChipFiltro({
    required this.ativo,
    required this.texto,
    this.aoTocar,
    this.aoLimpar,
  });

  final bool ativo;
  final String texto;
  final VoidCallback? aoTocar;
  final VoidCallback? aoLimpar;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: aoTocar,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: ativo ? AppCores.primaria : AppCores.branco,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: ativo ? AppCores.primaria : AppCores.neutra,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              texto,
              style: TextStyle(
                fontSize: 13,
                fontWeight: ativo ? FontWeight.w600 : FontWeight.normal,
                color: ativo ? AppCores.branco : AppCores.textoEscuro,
              ),
            ),
            const SizedBox(width: 4),
            if (ativo && aoLimpar != null)
              GestureDetector(
                onTap: aoLimpar,
                child: const Icon(
                  Icons.close,
                  size: 15,
                  color: AppCores.branco,
                ),
              )
            else
              Icon(
                Icons.arrow_drop_down,
                size: 18,
                color: ativo ? AppCores.branco : AppCores.textoSuave,
              ),
          ],
        ),
      ),
    );
  }
}
