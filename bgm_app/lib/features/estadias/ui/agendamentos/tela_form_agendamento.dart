import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/formatadores.dart';
import '../../../../core/theme/app_cores.dart';
import '../../../../shared/widgets/estado_lista.dart';
import '../../models/agendamento.dart';
import '../../models/entrada_agendamento.dart';
import '../../models/enums.dart';
import '../../models/pertences_deixados.dart';
import '../../models/plano_estadia.dart';
import '../../providers/estadias_providers.dart';

/// Criacao e edicao de agendamento.
///
/// Os blocos Plano de Estadia e Pertences so aparecem para Hotel/Creche, e
/// a recorrencia so para Creche — espelhando as regras de
/// [ValidacaoAgendamento].
class TelaFormAgendamento extends ConsumerStatefulWidget {
  const TelaFormAgendamento({super.key, this.agendamentoId});

  final String? agendamentoId;

  bool get editando => agendamentoId != null;

  @override
  ConsumerState<TelaFormAgendamento> createState() =>
      _TelaFormAgendamentoState();
}

class _TelaFormAgendamentoState extends ConsumerState<TelaFormAgendamento> {
  final _formKey = GlobalKey<FormState>();

  String? _animalId;
  TipoAgendamento _tipo = TipoAgendamento.creche;
  StatusAgendamento _status = StatusAgendamento.solicitado;
  DateTime _inicio = DateTime.now();
  DateTime? _fim;
  bool _recorrente = false;
  final _dias = <DiaSemana>{};
  final _observacoes = TextEditingController();

  // Plano de estadia
  TipoPlano? _tipoPlano;
  FormaPagamento? _formaPagamento;
  final _totalDias = TextEditingController();
  final _valorTotal = TextEditingController();
  TimeOfDay? _horarioEntrada;
  TimeOfDay? _horarioSaida;

  // Pertences
  bool _temCaminha = false;
  bool _temRoupa = false;
  bool _temBrinquedo = false;
  final _corCaminha = TextEditingController();
  final _corRoupa = TextEditingController();
  final _qualBrinquedo = TextEditingController();
  final _racao = TextEditingController();
  final _quantidade = TextEditingController();
  final _vezes = TextEditingController();
  final _obsPertences = TextEditingController();

  bool _carregado = false;
  bool _salvando = false;

  @override
  void dispose() {
    for (final c in [
      _observacoes,
      _totalDias,
      _valorTotal,
      _corCaminha,
      _corRoupa,
      _qualBrinquedo,
      _racao,
      _quantidade,
      _vezes,
      _obsPertences,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _preencher(Agendamento a) {
    _animalId = a.animalId;
    _tipo = a.tipo;
    _status = a.status;
    _inicio = a.dataHoraInicio;
    _fim = a.dataHoraFim;
    _recorrente = a.recorrente;
    _dias
      ..clear()
      ..addAll(a.diasSemanaRecorrencia);
    _observacoes.text = a.observacoes ?? '';

    final p = a.planoEstadia;
    _tipoPlano = p?.tipoPlano;
    _formaPagamento = p?.formaPagamento;
    _totalDias.text = p?.totalDias?.toString() ?? '';
    _valorTotal.text = p?.valorTotal?.toString() ?? '';
    _horarioEntrada = p?.horarioEntrada;
    _horarioSaida = p?.horarioSaida;

    final d = a.pertencesDeixados;
    _temCaminha = d?.temCaminha ?? false;
    _temRoupa = d?.temRoupa ?? false;
    _temBrinquedo = d?.temBrinquedo ?? false;
    _corCaminha.text = d?.corCaminha ?? '';
    _corRoupa.text = d?.corRoupa ?? '';
    _qualBrinquedo.text = d?.qualBrinquedo ?? '';
    _racao.text = d?.racao ?? '';
    _quantidade.text = d?.quantidade ?? '';
    _vezes.text = d?.vezes ?? '';
    _obsPertences.text = d?.observacoes ?? '';

    _carregado = true;
  }

  EntradaAgendamento _montarEntrada() {
    final valor = num.tryParse(_valorTotal.text.trim().replaceAll(',', '.'));

    final PlanoEstadia? plano;
    if (_tipo.exigePlanoEstadia) {
      // Creche: rotina diaria completa.
      plano = PlanoEstadia(
        tipoPlano: _tipoPlano,
        totalDias: int.tryParse(_totalDias.text.trim()),
        horarioEntrada: _horarioEntrada,
        horarioSaida: _horarioSaida,
        formaPagamento: _formaPagamento,
        valorTotal: valor,
      );
    } else if (_tipo.temEstadia && valor != null) {
      // Hotel: nao tem plano; o valor da estadia e guardado sozinho.
      plano = PlanoEstadia(valorTotal: valor);
    } else {
      plano = null;
    }

    final pertences = _tipo.temEstadia
        ? PertencesDeixados(
            temCaminha: _temCaminha,
            corCaminha: _textoOuNulo(_corCaminha),
            temRoupa: _temRoupa,
            corRoupa: _textoOuNulo(_corRoupa),
            temBrinquedo: _temBrinquedo,
            qualBrinquedo: _textoOuNulo(_qualBrinquedo),
            racao: _textoOuNulo(_racao),
            quantidade: _textoOuNulo(_quantidade),
            vezes: _textoOuNulo(_vezes),
            observacoes: _textoOuNulo(_obsPertences),
          )
        : null;

    return EntradaAgendamento(
      animalId: _animalId ?? '',
      tipo: _tipo,
      dataHoraInicio: _inicio,
      dataHoraFim: _fim,
      status: _status,
      recorrente: _recorrente && _tipo.permiteRecorrencia,
      diasSemanaRecorrencia: _tipo.permiteRecorrencia
          ? _dias.toList()
          : const [],
      observacoes: _textoOuNulo(_observacoes),
      planoEstadia: plano,
      pertencesDeixados: pertences,
    );
  }

  static String? _textoOuNulo(TextEditingController c) =>
      c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;

    final entrada = _montarEntrada();
    final erro = ValidacaoAgendamento.validar(entrada);
    if (erro != null) {
      _avisar(erro, erro: true);
      return;
    }

    setState(() => _salvando = true);
    try {
      final acoes = ref.read(acoesEstadiasProvider);
      if (widget.editando) {
        await acoes.atualizarAgendamento(widget.agendamentoId!, entrada);
        if (mounted) _avisar('Agendamento atualizado.');
      } else {
        final criados = await acoes.criarAgendamento(entrada);
        if (mounted) {
          _avisar(
            criados.length > 1
                ? '${criados.length} ocorrências criadas.'
                : 'Agendamento criado.',
          );
        }
      }
      if (mounted) context.go('/estadias');
    } on ErroValidacao catch (e) {
      _avisar(e.mensagem, erro: true);
    } catch (e) {
      _avisar('Não foi possível salvar: $e', erro: true);
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  Future<void> _cancelarAgendamento() async {
    final confirmou = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancelar agendamento'),
        content: const Text(
          'O agendamento será marcado como Cancelado. '
          'O registro não é apagado.',
        ),
        actions: [
          TextButton(
            onPressed: () => context.pop(false),
            child: const Text('Voltar'),
          ),
          ElevatedButton(
            onPressed: () => context.pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: AppCores.erro),
            child: const Text('Cancelar agendamento'),
          ),
        ],
      ),
    );
    if (confirmou != true) return;

    try {
      await ref
          .read(acoesEstadiasProvider)
          .cancelarAgendamento(widget.agendamentoId!);
      if (mounted) {
        _avisar('Agendamento cancelado.');
        context.go('/estadias');
      }
    } catch (e) {
      _avisar('Não foi possível cancelar: $e', erro: true);
    }
  }

  void _avisar(String msg, {bool erro = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: erro ? AppCores.erro : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Em edicao, aguarda o carregamento antes de montar o formulario.
    if (widget.editando && !_carregado) {
      final agendamento = ref.watch(
        agendamentoProvider(widget.agendamentoId!),
      );
      return Scaffold(
        appBar: AppBar(title: const Text('Editar agendamento')),
        body: agendamento.when(
          loading: () => const CarregandoCentral(),
          error: (e, _) => EstadoErro(mensagem: '$e'),
          data: (a) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _preencher(a));
            });
            return const CarregandoCentral();
          },
        ),
      );
    }

    final animais = ref.watch(animaisProvider);
    final temEstadia = _tipo.temEstadia;
    final temPlano = _tipo.exigePlanoEstadia;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.editando ? 'Editar agendamento' : 'Novo agendamento',
        ),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/estadias'),
        ),
        actions: [
          if (widget.editando && _status != StatusAgendamento.cancelado)
            IconButton(
              tooltip: 'Cancelar agendamento',
              icon: const Icon(Icons.event_busy),
              onPressed: _cancelarAgendamento,
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            _Secao(
              titulo: 'Dados principais',
              children: [
                animais.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text('Erro ao carregar animais: $e'),
                  data: (lista) => DropdownButtonFormField<String>(
                    initialValue: _animalId,
                    decoration: const InputDecoration(labelText: 'Animal *'),
                    items: [
                      for (final a in lista)
                        DropdownMenuItem(
                          value: a.id,
                          child: Text(
                            '${a.nome}'
                            '${a.tutor != null ? ' — ${a.tutor!.nomeCompleto}' : ''}',
                          ),
                        ),
                    ],
                    onChanged: (v) => setState(() => _animalId = v),
                    validator: (v) =>
                        v == null ? 'Selecione o animal' : null,
                  ),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<TipoAgendamento>(
                  initialValue: _tipo,
                  decoration: const InputDecoration(labelText: 'Tipo *'),
                  items: [
                    for (final t in TipoAgendamento.values)
                      DropdownMenuItem(value: t, child: Text(t.rotulo)),
                  ],
                  onChanged: (v) => setState(() {
                    _tipo = v ?? _tipo;
                    if (!_tipo.permiteRecorrencia) {
                      _recorrente = false;
                      _dias.clear();
                    }
                  }),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<StatusAgendamento>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: [
                    for (final s in StatusAgendamento.values)
                      DropdownMenuItem(value: s, child: Text(s.rotulo)),
                  ],
                  onChanged: (v) => setState(() => _status = v ?? _status),
                ),
              ],
            ),
            _Secao(
              titulo: 'Período',
              children: [
                _LinhaDataHora(
                  rotulo: 'Início *',
                  valor: _inicio,
                  aoAlterar: (d) => setState(() => _inicio = d),
                ),
                const Divider(height: 20),
                _LinhaDataHora(
                  rotulo: 'Fim',
                  valor: _fim,
                  opcional: true,
                  aoAlterar: (d) => setState(() => _fim = d),
                  aoLimpar: () => setState(() => _fim = null),
                ),
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    'A data final é opcional, exceto em agendamentos recorrentes.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppCores.textoSuave,
                    ),
                  ),
                ),
              ],
            ),
            if (_tipo.permiteRecorrencia)
              _Secao(
                titulo: 'Recorrência',
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Agendamento recorrente'),
                    subtitle: const Text(
                      'Gera uma ocorrência por dia marcado dentro do período.',
                    ),
                    value: _recorrente,
                    onChanged: (v) => setState(() => _recorrente = v),
                  ),
                  if (_recorrente) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final d in DiaSemana.values)
                          FilterChip(
                            label: Text(d.abreviado),
                            selected: _dias.contains(d),
                            onSelected: (sel) => setState(() {
                              sel ? _dias.add(d) : _dias.remove(d);
                            }),
                            labelStyle: TextStyle(
                              color: _dias.contains(d)
                                  ? AppCores.branco
                                  : AppCores.textoEscuro,
                            ),
                          ),
                      ],
                    ),
                    if (_dias.isNotEmpty && _fim != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          'Serão geradas '
                          '${FakeContagem.contar(_montarEntrada())} ocorrências.',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppCores.primaria,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            // Plano de estadia = rotina diaria. So na Creche.
            if (temPlano)
              _Secao(
                titulo: 'Plano de estadia',
                children: [
                  DropdownButtonFormField<TipoPlano>(
                    initialValue: _tipoPlano,
                    decoration: const InputDecoration(
                      labelText: 'Tipo de plano',
                    ),
                    items: [
                      for (final t in TipoPlano.values)
                        DropdownMenuItem(value: t, child: Text(t.rotulo)),
                    ],
                    onChanged: (v) => setState(() => _tipoPlano = v),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _Hora(
                          rotulo: 'Entrada',
                          valor: _horarioEntrada,
                          aoAlterar: (h) =>
                              setState(() => _horarioEntrada = h),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _Hora(
                          rotulo: 'Saída',
                          valor: _horarioSaida,
                          aoAlterar: (h) => setState(() => _horarioSaida = h),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _totalDias,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Total de dias',
                    ),
                  ),
                ],
              ),

            if (temEstadia) ...[
              // Hotel nao tem plano: a entrada e a saida sao o proprio
              // periodo, entao resta apenas o valor da estadia.
              _Secao(
                titulo: 'Valor',
                children: [
                  TextFormField(
                    controller: _valorTotal,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Valor total da estadia',
                      prefixText: 'R\$ ',
                    ),
                  ),
                  if (temPlano) ...[
                    const SizedBox(height: 14),
                    DropdownButtonFormField<FormaPagamento>(
                      initialValue: _formaPagamento,
                      decoration: const InputDecoration(
                        labelText: 'Forma de pagamento',
                      ),
                      items: [
                        for (final f in FormaPagamento.values)
                          DropdownMenuItem(value: f, child: Text(f.rotulo)),
                      ],
                      onChanged: (v) => setState(() => _formaPagamento = v),
                    ),
                  ],
                ],
              ),
              _Secao(
                titulo: 'Pertences deixados',
                children: [
                  _ItemPertence(
                    titulo: 'Caminha',
                    marcado: _temCaminha,
                    aoMarcar: (v) => setState(() => _temCaminha = v),
                    controlador: _corCaminha,
                    rotuloCampo: 'Cor da caminha',
                  ),
                  _ItemPertence(
                    titulo: 'Roupa',
                    marcado: _temRoupa,
                    aoMarcar: (v) => setState(() => _temRoupa = v),
                    controlador: _corRoupa,
                    rotuloCampo: 'Cor da roupa',
                  ),
                  _ItemPertence(
                    titulo: 'Brinquedo',
                    marcado: _temBrinquedo,
                    aoMarcar: (v) => setState(() => _temBrinquedo = v),
                    controlador: _qualBrinquedo,
                    rotuloCampo: 'Qual brinquedo',
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _racao,
                    decoration: const InputDecoration(labelText: 'Ração'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _quantidade,
                          decoration: const InputDecoration(
                            labelText: 'Quantidade',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _vezes,
                          decoration: const InputDecoration(
                            labelText: 'Vezes ao dia',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _obsPertences,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Observações dos pertences',
                    ),
                  ),
                ],
              ),
            ],
            _Secao(
              titulo: 'Observações',
              children: [
                TextFormField(
                  controller: _observacoes,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Observações gerais',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: _salvando ? null : _salvar,
            icon: _salvando
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppCores.branco,
                    ),
                  )
                : const Icon(Icons.check),
            label: Text(widget.editando ? 'Salvar alterações' : 'Criar'),
          ),
        ),
      ),
    );
  }
}

/// Previsao da quantidade de ocorrencias, exibida antes de salvar.
abstract final class FakeContagem {
  static int contar(EntradaAgendamento e) {
    if (!e.geraRecorrencia) return 0;
    final fim = e.dataHoraFim;
    if (fim == null) return 0;
    final dias = e.diasSemanaRecorrencia.map((d) => d.valor).toSet();
    var total = 0;
    var dia = DateTime(
      e.dataHoraInicio.year,
      e.dataHoraInicio.month,
      e.dataHoraInicio.day,
    );
    final ultimo = DateTime(fim.year, fim.month, fim.day);
    while (!dia.isAfter(ultimo)) {
      if (dias.contains(DiaSemana.deDateTime(dia).valor)) total++;
      dia = dia.add(const Duration(days: 1));
    }
    return total;
  }
}

class _Secao extends StatelessWidget {
  const _Secao({required this.titulo, required this.children});

  final String titulo;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppCores.primariaEscura,
            ),
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _LinhaDataHora extends StatelessWidget {
  const _LinhaDataHora({
    required this.rotulo,
    required this.valor,
    required this.aoAlterar,
    this.opcional = false,
    this.aoLimpar,
  });

  final String rotulo;
  final DateTime? valor;
  final ValueChanged<DateTime> aoAlterar;
  final bool opcional;
  final VoidCallback? aoLimpar;

  Future<void> _escolher(BuildContext context) async {
    final base = valor ?? DateTime.now();
    final data = await showDatePicker(
      context: context,
      initialDate: base,
      firstDate: DateTime(base.year - 2),
      lastDate: DateTime(base.year + 3),
      locale: const Locale('pt', 'BR'),
    );
    if (data == null || !context.mounted) return;
    final hora = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(base),
    );
    if (hora == null) return;
    aoAlterar(
      DateTime(data.year, data.month, data.day, hora.hour, hora.minute),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                rotulo,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppCores.textoSuave,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                valor == null
                    ? (opcional ? 'Não definido' : '—')
                    : Formatadores.dataHora.format(valor!),
                style: const TextStyle(fontSize: 15),
              ),
            ],
          ),
        ),
        if (valor != null && aoLimpar != null)
          IconButton(
            icon: const Icon(Icons.clear, size: 18),
            onPressed: aoLimpar,
          ),
        OutlinedButton.icon(
          onPressed: () => _escolher(context),
          icon: const Icon(Icons.edit_calendar, size: 18),
          label: const Text('Definir'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          ),
        ),
      ],
    );
  }
}

class _Hora extends StatelessWidget {
  const _Hora({
    required this.rotulo,
    required this.valor,
    required this.aoAlterar,
  });

  final String rotulo;
  final TimeOfDay? valor;
  final ValueChanged<TimeOfDay> aoAlterar;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        final h = await showTimePicker(
          context: context,
          initialTime: valor ?? const TimeOfDay(hour: 8, minute: 0),
        );
        if (h != null) aoAlterar(h);
      },
      child: InputDecorator(
        decoration: InputDecoration(labelText: rotulo),
        child: Text(
          valor == null ? '--:--' : valor!.format(context),
          style: const TextStyle(fontSize: 15),
        ),
      ),
    );
  }
}

class _ItemPertence extends StatelessWidget {
  const _ItemPertence({
    required this.titulo,
    required this.marcado,
    required this.aoMarcar,
    required this.controlador,
    required this.rotuloCampo,
  });

  final String titulo;
  final bool marcado;
  final ValueChanged<bool> aoMarcar;
  final TextEditingController controlador;
  final String rotuloCampo;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          dense: true,
          title: Text(titulo),
          value: marcado,
          onChanged: (v) => aoMarcar(v ?? false),
        ),
        if (marcado)
          Padding(
            padding: const EdgeInsets.only(left: 32, bottom: 8),
            child: TextFormField(
              controller: controlador,
              decoration: InputDecoration(labelText: rotuloCampo),
            ),
          ),
      ],
    );
  }
}
