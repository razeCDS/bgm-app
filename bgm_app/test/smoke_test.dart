import 'package:bgm_app/features/estadias/data/fake_estadias_repository.dart';
import 'package:bgm_app/features/estadias/models/entrada_agendamento.dart';
import 'package:bgm_app/features/estadias/models/enums.dart';
import 'package:bgm_app/features/estadias/models/animal.dart';
import 'package:bgm_app/features/estadias/models/filtro_agendamentos.dart';
import 'package:bgm_app/features/estadias/models/plano_estadia.dart';
import 'package:bgm_app/features/estadias/models/tutor.dart';
import 'package:bgm_app/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('pt_BR');
  });

  group('Navegacao', () {
    testWidgets('abre no login e chega na Home apos entrar', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: BgmApp()));
      await tester.pumpAndSettle();

      // Sem sessao, o redirect leva ao login.
      expect(find.text('BGM Daycare'), findsOneWidget);
      expect(find.text('Entrar'), findsOneWidget);

      await tester.enterText(find.byType(TextFormField).first, 'a@b.com');
      await tester.enterText(find.byType(TextFormField).last, '1234');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();

      // Home com os cards de modulo.
      expect(find.text('BGM Gestão Interna'), findsOneWidget);
      expect(find.text('BGM Estadias'), findsOneWidget);
      expect(find.text('BGM Banho/Tosa'), findsOneWidget);
    });

    testWidgets('card BGM Estadias abre o modulo em abas', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: BgmApp()));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'a@b.com');
      await tester.enterText(find.byType(TextFormField).last, '1234');
      await tester.tap(find.text('Entrar'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('BGM Estadias'));
      await tester.pumpAndSettle();

      expect(find.text('Agendamentos'), findsOneWidget);
      expect(find.text('Cães'), findsOneWidget);
      // Dados de exemplo carregados.
      expect(find.text('Rex'), findsWidgets);
    });
  });

  group('Regras de negocio', () {
    test('Visita nao aceita plano de estadia', () {
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.visita,
          dataHoraInicio: DateTime(2026, 8, 10),
          status: StatusAgendamento.solicitado,
          planoEstadia: const PlanoEstadia(),
        ),
      );
      expect(erro, contains('Visita'));
    });

    test('Hotel nao exige plano de estadia', () {
      // O Hotel usa o proprio periodo como entrada/saida; o plano (rotina
      // diaria) nao se aplica.
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.hotel,
          dataHoraInicio: DateTime(2026, 8, 10),
          status: StatusAgendamento.solicitado,
        ),
      );
      expect(erro, isNull);
    });

    test('Hotel aceita apenas o valor da estadia', () {
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.hotel,
          dataHoraInicio: DateTime(2026, 8, 10),
          dataHoraFim: DateTime(2026, 8, 14),
          status: StatusAgendamento.solicitado,
          planoEstadia: const PlanoEstadia(valorTotal: 480),
        ),
      );
      expect(erro, isNull);
    });

    test('Creche exige plano de estadia', () {
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.creche,
          dataHoraInicio: DateTime(2026, 8, 10),
          status: StatusAgendamento.solicitado,
        ),
      );
      expect(erro, contains('obrigatorio'));
    });

    test('recorrencia so vale para Creche', () {
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.hotel,
          dataHoraInicio: DateTime(2026, 8, 3),
          dataHoraFim: DateTime(2026, 8, 28),
          status: StatusAgendamento.solicitado,
          recorrente: true,
          diasSemanaRecorrencia: const [DiaSemana.segunda],
          planoEstadia: const PlanoEstadia(),
        ),
      );
      expect(erro, contains('Creche'));
    });

    test('data final anterior a inicial e rejeitada', () {
      final erro = ValidacaoAgendamento.validar(
        EntradaAgendamento(
          animalId: 'x',
          tipo: TipoAgendamento.visita,
          dataHoraInicio: DateTime(2026, 8, 10),
          dataHoraFim: DateTime(2026, 8, 9),
          status: StatusAgendamento.solicitado,
        ),
      );
      expect(erro, isNotNull);
    });
  });

  group('Recorrencia', () {
    test('DiaSemana converte DateTime do Dart para convencao Postgres', () {
      // 2026-08-02 e um domingo.
      expect(DiaSemana.deDateTime(DateTime(2026, 8, 2)), DiaSemana.domingo);
      expect(DiaSemana.deDateTime(DateTime(2026, 8, 3)), DiaSemana.segunda);
      expect(DiaSemana.deDateTime(DateTime(2026, 8, 8)), DiaSemana.sabado);
      expect(DiaSemana.domingo.valor, 0);
      expect(DiaSemana.sabado.valor, 6);
    });

    test('gera uma ocorrencia por dia marcado no periodo', () {
      final entrada = EntradaAgendamento(
        animalId: 'x',
        tipo: TipoAgendamento.creche,
        dataHoraInicio: DateTime(2026, 8, 3, 8),
        dataHoraFim: DateTime(2026, 8, 28, 18),
        status: StatusAgendamento.confirmado,
        recorrente: true,
        diasSemanaRecorrencia: const [
          DiaSemana.segunda,
          DiaSemana.quarta,
          DiaSemana.sexta,
        ],
        planoEstadia: const PlanoEstadia(),
      );

      final ocorrencias = FakeEstadiasRepository.gerarOcorrencias(entrada);

      // Agosto/2026: seg/qua/sex entre 03 e 28 => 12 dias.
      expect(ocorrencias.length, 12);
      for (final (inicio, _) in ocorrencias) {
        expect(
          const [1, 3, 5].contains(DiaSemana.deDateTime(inicio).valor),
          isTrue,
        );
      }
    });

    test('criarAgendamento persiste as ocorrencias com a mesma serie', () async {
      final repo = FakeEstadiasRepository(comDadosDeExemplo: false);
      final tutor = await repo.salvarTutor(
        const Tutor(id: '', nomeCompleto: 'Tutor Teste'),
      );
      final animal = await repo.salvarAnimal(
        Animal(id: '', tutorId: tutor.id, nome: 'Animal Teste'),
      );

      final criados = await repo.criarAgendamento(
        EntradaAgendamento(
          animalId: animal.id,
          tipo: TipoAgendamento.creche,
          dataHoraInicio: DateTime(2026, 8, 3, 8),
          dataHoraFim: DateTime(2026, 8, 14, 18),
          status: StatusAgendamento.confirmado,
          recorrente: true,
          diasSemanaRecorrencia: const [DiaSemana.segunda],
          planoEstadia: const PlanoEstadia(),
        ),
      );

      // Segundas entre 03 e 14/08/2026: dias 03 e 10.
      expect(criados.length, 2);
      final series = criados.map((a) => a.agendamentoRecorrenciaId).toSet();
      expect(series.length, 1, reason: 'todas na mesma serie');
      expect(series.first, isNotNull);

      // Cancelar uma ocorrencia nao afeta a outra.
      await repo.cancelarAgendamento(criados.first.id);
      final lista = await repo.listarAgendamentos(const FiltroAgendamentos());
      expect(
        lista.where((a) => a.status == StatusAgendamento.cancelado).length,
        1,
      );
      expect(
        lista.where((a) => a.status == StatusAgendamento.confirmado).length,
        1,
      );
    });
  });
}
