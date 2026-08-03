import 'package:flutter/material.dart';

import '../../core/theme/app_cores.dart';
import '../../features/estadias/models/enums.dart';

/// Chip colorido do status de um agendamento.
class ChipStatus extends StatelessWidget {
  const ChipStatus(this.status, {super.key, this.compacto = false});

  final StatusAgendamento status;
  final bool compacto;

  (Color fundo, Color texto) get _cores => switch (status) {
    StatusAgendamento.solicitado => (AppCores.neutraClara, AppCores.textoSuave),
    StatusAgendamento.confirmado => (
      AppCores.primaria.withValues(alpha: 0.12),
      AppCores.primariaEscura,
    ),
    StatusAgendamento.emAndamento => (AppCores.acento, AppCores.primariaEscura),
    StatusAgendamento.concluido => (
      AppCores.neutra.withValues(alpha: 0.35),
      AppCores.textoEscuro,
    ),
    StatusAgendamento.cancelado => (
      AppCores.erro.withValues(alpha: 0.10),
      AppCores.erro,
    ),
  };

  @override
  Widget build(BuildContext context) {
    final (fundo, texto) = _cores;
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compacto ? 8 : 10,
        vertical: compacto ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: fundo,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.rotulo,
        style: TextStyle(
          color: texto,
          fontSize: compacto ? 11 : 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Chip neutro para o tipo do agendamento.
class ChipTipo extends StatelessWidget {
  const ChipTipo(this.tipo, {super.key});

  final TipoAgendamento tipo;

  IconData get _icone => switch (tipo) {
    TipoAgendamento.visita => Icons.handshake_outlined,
    TipoAgendamento.hotel => Icons.hotel_outlined,
    TipoAgendamento.creche => Icons.wb_sunny_outlined,
  };

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(_icone, size: 15, color: AppCores.textoSuave),
        const SizedBox(width: 4),
        Text(
          tipo.rotulo,
          style: const TextStyle(
            fontSize: 12,
            color: AppCores.textoSuave,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
