import 'package:flutter/material.dart' show TimeOfDay;
import 'package:uuid/uuid.dart';

import '../models/agendamento.dart';
import '../models/anamnese.dart';
import '../models/animal.dart';
import '../models/contato_emergencia.dart';
import '../models/entrada_agendamento.dart';
import '../models/enums.dart';
import '../models/ficha_animal.dart';
import '../models/filtro_agendamentos.dart';
import '../models/pertences_deixados.dart';
import '../models/plano_estadia.dart';
import '../models/termo_consentimento.dart';
import '../models/tutor.dart';
import '../models/veterinario_info.dart';
import 'estadias_repository.dart';

/// Implementacao em memoria, usada enquanto a integracao com o Supabase
/// nao esta ligada. Reproduz as mesmas regras de negocio da implementacao
/// real, inclusive a geracao de ocorrencias recorrentes.
class FakeEstadiasRepository implements EstadiasRepository {
  FakeEstadiasRepository({bool comDadosDeExemplo = true}) {
    if (comDadosDeExemplo) _semear();
  }

  final _uuid = const Uuid();
  final _tutores = <Tutor>[];
  final _animais = <Animal>[];
  final _veterinarios = <VeterinarioInfo>[];
  final _anamneses = <Anamnese>[];
  final _termos = <TermoConsentimento>[];
  final _contatos = <ContatoEmergencia>[];
  final _agendamentos = <Agendamento>[];
  final _planos = <PlanoEstadia>[];
  final _pertences = <PertencesDeixados>[];

  /// Latencia artificial para a UI exercitar estados de carregamento.
  static const _atraso = Duration(milliseconds: 180);
  Future<void> get _esperar => Future.delayed(_atraso);

  // ── Tutores ─────────────────────────────────────────────────────────────

  @override
  Future<List<Tutor>> listarTutores() async {
    await _esperar;
    return List.unmodifiable(
      _tutores.toList()
        ..sort((a, b) => a.nomeCompleto.compareTo(b.nomeCompleto)),
    );
  }

  @override
  Future<Tutor> salvarTutor(Tutor tutor) async {
    await _esperar;
    if (tutor.id.isEmpty) {
      final novo = tutor.copyWith(id: _uuid.v4());
      _tutores.add(novo);
      return novo;
    }
    final i = _tutores.indexWhere((t) => t.id == tutor.id);
    if (i < 0) throw const ErroValidacao('Tutor nao encontrado.');
    _tutores[i] = tutor;
    return tutor;
  }

  // ── Animais ─────────────────────────────────────────────────────────────

  Tutor _tutorDe(String tutorId) =>
      _tutores.firstWhere((t) => t.id == tutorId);

  @override
  Future<List<Animal>> listarAnimais({String? busca}) async {
    await _esperar;
    final termo = (busca ?? '').trim().toLowerCase();
    final lista = _animais
        .map((a) => a.copyWith(tutor: _tutorDe(a.tutorId)))
        .where((a) {
          if (termo.isEmpty) return true;
          return a.nome.toLowerCase().contains(termo) ||
              (a.raca ?? '').toLowerCase().contains(termo) ||
              (a.tutor?.nomeCompleto ?? '').toLowerCase().contains(termo);
        })
        .toList()
      ..sort((a, b) => a.nome.compareTo(b.nome));
    return List.unmodifiable(lista);
  }

  @override
  Future<FichaAnimal> obterFicha(String animalId) async {
    await _esperar;
    final animal = _animais.firstWhere((a) => a.id == animalId);
    return FichaAnimal(
      animal: animal.copyWith(tutor: _tutorDe(animal.tutorId)),
      tutor: _tutorDe(animal.tutorId),
      veterinario:
          _veterinarios.where((v) => v.animalId == animalId).firstOrNull,
      anamnese: _anamneses.where((a) => a.animalId == animalId).firstOrNull,
      termo: _termos.where((t) => t.animalId == animalId).firstOrNull,
      contatos: _contatos.where((c) => c.animalId == animalId).toList()
        ..sort((a, b) => (a.ordem ?? 0).compareTo(b.ordem ?? 0)),
    );
  }

  @override
  Future<Animal> salvarAnimal(Animal animal) async {
    await _esperar;
    if (animal.id.isEmpty) {
      final novo = animal.copyWith(id: _uuid.v4());
      _animais.add(novo);
      return novo;
    }
    final i = _animais.indexWhere((a) => a.id == animal.id);
    if (i < 0) throw const ErroValidacao('Animal nao encontrado.');
    _animais[i] = animal;
    return animal;
  }

  @override
  Future<FichaAnimal> salvarFicha(FichaAnimal ficha) async {
    await _esperar;
    final animalId = ficha.animal.id;

    void trocar<T>(List<T> alvo, T? valor, bool Function(T) pertence) {
      alvo.removeWhere(pertence);
      if (valor != null) alvo.add(valor);
    }

    trocar(
      _veterinarios,
      ficha.veterinario,
      (v) => v.animalId == animalId,
    );
    trocar(_anamneses, ficha.anamnese, (a) => a.animalId == animalId);
    trocar(_termos, ficha.termo, (t) => t.animalId == animalId);

    _contatos.removeWhere((c) => c.animalId == animalId);
    _contatos.addAll(ficha.contatos);

    return obterFicha(animalId);
  }

  // ── Agendamentos ────────────────────────────────────────────────────────

  Agendamento _hidratar(Agendamento a) {
    final animal = _animais.where((x) => x.id == a.animalId).firstOrNull;
    return a.copyWith(
      animal: animal?.copyWith(tutor: _tutorDe(animal.tutorId)),
      planoEstadia:
          _planos.where((p) => p.agendamentoId == a.id).firstOrNull,
      pertencesDeixados:
          _pertences.where((p) => p.agendamentoId == a.id).firstOrNull,
    );
  }

  @override
  Future<List<Agendamento>> listarAgendamentos(
    FiltroAgendamentos filtro,
  ) async {
    await _esperar;
    final lista = _agendamentos.map(_hidratar).where((a) {
      if (filtro.animalId != null && a.animalId != filtro.animalId) {
        return false;
      }
      if (filtro.tutorId != null && a.animal?.tutorId != filtro.tutorId) {
        return false;
      }
      if (filtro.tipo != null && a.tipo != filtro.tipo) return false;
      if (filtro.status != null && a.status != filtro.status) return false;
      // Intervalo: sobreposicao com o periodo informado.
      if (filtro.dataInicio != null) {
        final fim = a.dataHoraFim ?? a.dataHoraInicio;
        if (fim.isBefore(filtro.dataInicio!)) return false;
      }
      if (filtro.dataFim != null && a.dataHoraInicio.isAfter(filtro.dataFim!)) {
        return false;
      }
      return true;
    }).toList()
      ..sort((a, b) => a.dataHoraInicio.compareTo(b.dataHoraInicio));
    return List.unmodifiable(lista);
  }

  @override
  Future<Agendamento> obterAgendamento(String id) async {
    await _esperar;
    return _hidratar(_agendamentos.firstWhere((a) => a.id == id));
  }

  @override
  Future<List<Agendamento>> criarAgendamento(
    EntradaAgendamento entrada,
  ) async {
    ValidacaoAgendamento.garantirValido(entrada);
    await _esperar;

    if (!entrada.geraRecorrencia) {
      return [_inserirUm(entrada, dataHoraInicio: entrada.dataHoraInicio)];
    }

    final serieId = _uuid.v4();
    final ocorrencias = <Agendamento>[];
    for (final (inicio, fim) in gerarOcorrencias(entrada)) {
      ocorrencias.add(
        _inserirUm(
          entrada,
          dataHoraInicio: inicio,
          dataHoraFim: fim,
          serieId: serieId,
          // A ocorrencia individual nao repete: ela e o resultado da regra.
          recorrente: false,
        ),
      );
    }
    return ocorrencias;
  }

  Agendamento _inserirUm(
    EntradaAgendamento e, {
    required DateTime dataHoraInicio,
    DateTime? dataHoraFim,
    String? serieId,
    bool? recorrente,
  }) {
    final id = _uuid.v4();
    final novo = Agendamento(
      id: id,
      animalId: e.animalId,
      tipo: e.tipo,
      dataHoraInicio: dataHoraInicio,
      dataHoraFim: dataHoraFim ?? e.dataHoraFim,
      status: e.status,
      recorrente: recorrente ?? e.recorrente,
      diasSemanaRecorrencia: serieId == null ? e.diasSemanaRecorrencia : const [],
      agendamentoRecorrenciaId: serieId,
      observacoes: e.observacoes,
    );
    _agendamentos.add(novo);
    if (e.planoEstadia != null) {
      _planos.add(e.planoEstadia!.copyWith(id: _uuid.v4(), agendamentoId: id));
    }
    if (e.pertencesDeixados != null) {
      _pertences.add(
        e.pertencesDeixados!.copyWith(id: _uuid.v4(), agendamentoId: id),
      );
    }
    return _hidratar(novo);
  }

  @override
  Future<Agendamento> atualizarAgendamento(
    String id,
    EntradaAgendamento entrada,
  ) async {
    ValidacaoAgendamento.garantirValido(entrada);
    await _esperar;

    final i = _agendamentos.indexWhere((a) => a.id == id);
    if (i < 0) throw const ErroValidacao('Agendamento nao encontrado.');
    final atual = _agendamentos[i];

    _agendamentos[i] = atual.copyWith(
      animalId: entrada.animalId,
      tipo: entrada.tipo,
      dataHoraInicio: entrada.dataHoraInicio,
      dataHoraFim: entrada.dataHoraFim,
      status: entrada.status,
      observacoes: entrada.observacoes,
    );

    _planos.removeWhere((p) => p.agendamentoId == id);
    if (entrada.planoEstadia != null) {
      _planos.add(
        entrada.planoEstadia!.copyWith(id: _uuid.v4(), agendamentoId: id),
      );
    }
    _pertences.removeWhere((p) => p.agendamentoId == id);
    if (entrada.pertencesDeixados != null) {
      _pertences.add(
        entrada.pertencesDeixados!.copyWith(id: _uuid.v4(), agendamentoId: id),
      );
    }

    return _hidratar(_agendamentos[i]);
  }

  @override
  Future<Agendamento> cancelarAgendamento(String id) async {
    await _esperar;
    final i = _agendamentos.indexWhere((a) => a.id == id);
    if (i < 0) throw const ErroValidacao('Agendamento nao encontrado.');
    _agendamentos[i] = _agendamentos[i].copyWith(
      status: StatusAgendamento.cancelado,
    );
    return _hidratar(_agendamentos[i]);
  }

  // ── Recorrencia ─────────────────────────────────────────────────────────

  /// Gera os pares (inicio, fim) de cada ocorrencia dentro do periodo.
  ///
  /// Mesma regra da funcao Postgres: percorre dia a dia de
  /// `data_hora_inicio` ate `data_hora_fim` e seleciona os que casam com
  /// `dias_semana_recorrencia` (0 = domingo). O horario vem do plano de
  /// estadia quando informado; senao, do proprio inicio.
  static List<(DateTime, DateTime?)> gerarOcorrencias(EntradaAgendamento e) {
    final fimPeriodo = e.dataHoraFim;
    if (fimPeriodo == null || e.diasSemanaRecorrencia.isEmpty) return const [];

    final dias = e.diasSemanaRecorrencia.map((d) => d.valor).toSet();
    final entrada = e.planoEstadia?.horarioEntrada;
    final saida = e.planoEstadia?.horarioSaida;

    final resultado = <(DateTime, DateTime?)>[];
    var dia = DateTime(
      e.dataHoraInicio.year,
      e.dataHoraInicio.month,
      e.dataHoraInicio.day,
    );
    final ultimo = DateTime(fimPeriodo.year, fimPeriodo.month, fimPeriodo.day);

    while (!dia.isAfter(ultimo)) {
      if (dias.contains(DiaSemana.deDateTime(dia).valor)) {
        final inicio = DateTime(
          dia.year,
          dia.month,
          dia.day,
          entrada?.hour ?? e.dataHoraInicio.hour,
          entrada?.minute ?? e.dataHoraInicio.minute,
        );
        final fim = saida == null
            ? null
            : DateTime(dia.year, dia.month, dia.day, saida.hour, saida.minute);
        resultado.add((inicio, fim));
      }
      dia = dia.add(const Duration(days: 1));
    }
    return resultado;
  }

  // ── Dados de exemplo ────────────────────────────────────────────────────

  void _semear() {
    final maria = Tutor(
      id: _uuid.v4(),
      nomeCompleto: 'Maria Silva',
      cpfCnpj: '123.456.789-00',
      rg: '12.345.678-9',
      endereco: 'Rua das Flores, 100 — São Paulo/SP',
      telefone: '(11) 99999-8888',
      email: 'maria.silva@email.com',
    );
    final joao = Tutor(
      id: _uuid.v4(),
      nomeCompleto: 'João Pereira',
      cpfCnpj: '987.654.321-00',
      endereco: 'Av. Brasil, 2500 — Rio de Janeiro/RJ',
      telefone: '(21) 98888-7777',
      email: 'joao.pereira@email.com',
    );
    final ana = Tutor(
      id: _uuid.v4(),
      nomeCompleto: 'Ana Souza',
      cpfCnpj: '11.222.333/0001-44',
      endereco: 'Rua do Comércio, 45 — Belo Horizonte/MG',
      telefone: '(31) 97777-6666',
    );
    _tutores.addAll([maria, joao, ana]);

    final rex = Animal(
      id: _uuid.v4(),
      tutorId: maria.id,
      nome: 'Rex',
      raca: 'Labrador',
      idade: 4,
      porte: PorteAnimal.medio,
      peso: 28.5,
      especie: EspecieAnimal.canina,
      sexo: SexoAnimal.macho,
      castrado: true,
      docil: true,
      observacoes: 'Muito sociável, adora crianças.',
    );
    final mel = Animal(
      id: _uuid.v4(),
      tutorId: maria.id,
      nome: 'Mel',
      raca: 'Siamês',
      idade: 2,
      porte: PorteAnimal.pequeno,
      peso: 4.2,
      especie: EspecieAnimal.felina,
      sexo: SexoAnimal.femea,
      castrado: true,
      docil: true,
      observacoes: 'Tímida com estranhos.',
    );
    final thor = Animal(
      id: _uuid.v4(),
      tutorId: joao.id,
      nome: 'Thor',
      raca: 'Rottweiler',
      idade: 5,
      porte: PorteAnimal.grande,
      peso: 45,
      especie: EspecieAnimal.canina,
      sexo: SexoAnimal.macho,
      castrado: false,
      docil: false,
      observacoes: 'Manejo cuidadoso; reativo com outros machos.',
    );
    final luna = Animal(
      id: _uuid.v4(),
      tutorId: ana.id,
      nome: 'Luna',
      raca: 'Poodle',
      idade: 1,
      porte: PorteAnimal.mini,
      peso: 3.1,
      especie: EspecieAnimal.canina,
      sexo: SexoAnimal.femea,
      castrado: false,
      docil: true,
      observacoes: 'Filhote cheio de energia.',
    );
    _animais.addAll([rex, mel, thor, luna]);

    _veterinarios.add(
      VeterinarioInfo(
        id: _uuid.v4(),
        animalId: rex.id,
        nomeVeterinario: 'Dr. Carlos Mendes',
        temEspecialidade: true,
        qualEspecialidade: 'Ortopedia',
        telefoneVeterinario: '(11) 3333-4444',
        nomeClinica: 'PetVida',
        telefoneClinica: '(11) 3333-0000',
        enderecoClinica: 'Rua dos Animais, 50 — São Paulo/SP',
      ),
    );

    _anamneses.addAll([
      Anamnese(
        id: _uuid.v4(),
        animalId: rex.id,
        doencaPreexistente: false,
        alergias: 'Nenhuma conhecida',
        cuidadosEspeciais: false,
        tomaMedicacao: false,
        vermifugadoUltimoMes: true,
        dataVermifugo: DateTime(2026, 7, 20),
        vacinadoEsteAno: true,
        dataVacinacao: DateTime(2026, 3, 15),
        observacoes: 'Saudável.',
      ),
      Anamnese(
        id: _uuid.v4(),
        animalId: thor.id,
        doencaPreexistente: true,
        doencaQual: 'Displasia coxofemoral leve',
        alergias: 'Frango',
        cuidadosEspeciais: true,
        cuidadosQual: 'Evitar exercícios de alto impacto',
        tomaMedicacao: true,
        medicacaoQual: 'Condroprotetor 1x/dia',
        vermifugadoUltimoMes: false,
        vacinadoEsteAno: true,
        dataVacinacao: DateTime(2026, 5, 10),
        observacoes: 'Acompanhamento ortopédico semestral.',
      ),
    ]);

    _termos.add(
      TermoConsentimento(
        id: _uuid.v4(),
        animalId: rex.id,
        aceito: true,
        dataAceite: DateTime(2026, 7, 25),
        localAceite: 'São Paulo/SP',
      ),
    );

    _contatos.addAll([
      ContatoEmergencia(
        id: _uuid.v4(),
        animalId: rex.id,
        nome: 'Maria Silva',
        parentesco: 'Tutora',
        telefone: '(11) 99999-8888',
        ordem: 1,
      ),
      ContatoEmergencia(
        id: _uuid.v4(),
        animalId: rex.id,
        nome: 'Pedro Silva',
        parentesco: 'Irmão',
        telefone: '(11) 96666-5555',
        ordem: 2,
      ),
      ContatoEmergencia(
        id: _uuid.v4(),
        animalId: thor.id,
        nome: 'João Pereira',
        parentesco: 'Tutor',
        telefone: '(21) 98888-7777',
        ordem: 1,
      ),
    ]);

    // Visita — sem plano nem pertences.
    _inserirUm(
      EntradaAgendamento(
        animalId: luna.id,
        tipo: TipoAgendamento.visita,
        dataHoraInicio: DateTime(2026, 8, 10, 14),
        dataHoraFim: DateTime(2026, 8, 10, 15),
        status: StatusAgendamento.solicitado,
        observacoes: 'Primeira visita para conhecer o espaço.',
      ),
      dataHoraInicio: DateTime(2026, 8, 10, 14),
    );

    // Hotel — com plano e pertences.
    _inserirUm(
      EntradaAgendamento(
        animalId: thor.id,
        tipo: TipoAgendamento.hotel,
        dataHoraInicio: DateTime(2026, 8, 18, 9),
        dataHoraFim: DateTime(2026, 8, 22, 18),
        status: StatusAgendamento.confirmado,
        observacoes: 'Hospedagem durante viagem do tutor.',
        planoEstadia: const PlanoEstadia(
          tipoPlano: TipoPlano.diaria,
          totalDias: 4,
          horarioEntrada: TimeOfDayLiteral.nove,
          horarioSaida: TimeOfDayLiteral.dezoito,
          formaPagamento: FormaPagamento.pix,
          valorTotal: 480,
        ),
        pertencesDeixados: const PertencesDeixados(
          temCaminha: true,
          corCaminha: 'Cinza',
          temRoupa: false,
          temBrinquedo: true,
          qualBrinquedo: 'Mordedor de borracha',
          racao: 'Golden Grande Porte',
          quantidade: '300g',
          vezes: '2x ao dia',
          observacoes: 'Ração própria; não misturar com outras.',
        ),
      ),
      dataHoraInicio: DateTime(2026, 8, 18, 9),
    );

    // Creche avulsa.
    _inserirUm(
      EntradaAgendamento(
        animalId: mel.id,
        tipo: TipoAgendamento.creche,
        dataHoraInicio: DateTime(2026, 8, 5, 8),
        dataHoraFim: DateTime(2026, 8, 5, 17),
        status: StatusAgendamento.emAndamento,
        observacoes: 'Creche por um dia.',
        planoEstadia: const PlanoEstadia(
          tipoPlano: TipoPlano.diaria,
          totalDias: 1,
          horarioEntrada: TimeOfDayLiteral.oito,
          horarioSaida: TimeOfDayLiteral.dezessete,
          formaPagamento: FormaPagamento.pix,
          valorTotal: 80,
        ),
      ),
      dataHoraInicio: DateTime(2026, 8, 5, 8),
    );

    // Creche recorrente — Seg/Qua/Sex ao longo de agosto.
    final serieId = _uuid.v4();
    final regra = EntradaAgendamento(
      animalId: rex.id,
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
      observacoes: 'Creche recorrente durante o mês.',
      planoEstadia: const PlanoEstadia(
        tipoPlano: TipoPlano.mensal,
        horarioEntrada: TimeOfDayLiteral.oito,
        horarioSaida: TimeOfDayLiteral.dezoito,
        formaPagamento: FormaPagamento.dinheiro,
        valorTotal: 900,
      ),
    );
    for (final (inicio, fim) in gerarOcorrencias(regra)) {
      _inserirUm(
        regra,
        dataHoraInicio: inicio,
        dataHoraFim: fim,
        serieId: serieId,
        recorrente: false,
      );
    }
  }
}

/// Horarios constantes usados nos dados de exemplo.
///
/// `TimeOfDay` nao e `const`-construtivel em expressoes constantes aninhadas,
/// entao os valores fixos ficam centralizados aqui.
abstract final class TimeOfDayLiteral {
  static const oito = TimeOfDay(hour: 8, minute: 0);
  static const nove = TimeOfDay(hour: 9, minute: 0);
  static const dezessete = TimeOfDay(hour: 17, minute: 0);
  static const dezoito = TimeOfDay(hour: 18, minute: 0);
}
