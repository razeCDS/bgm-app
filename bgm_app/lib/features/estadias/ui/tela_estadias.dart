import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import 'agendamentos/aba_agendamentos.dart';
import 'caes/aba_caes.dart';

/// Modulo BGM Estadias: navegacao em abas.
class TelaEstadias extends StatelessWidget {
  const TelaEstadias({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('BGM Estadias'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go(Rotas.inicio),
          ),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.event_note), text: 'Agendamentos'),
              Tab(icon: Icon(Icons.pets), text: 'Cães'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [AbaAgendamentos(), AbaCaes()],
        ),
      ),
    );
  }
}
