import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/formatadores.dart';
import '../../../../core/theme/app_cores.dart';
import '../../../../shared/widgets/estado_lista.dart';
import '../../models/anamnese.dart';
import '../../models/animal.dart';
import '../../models/contato_emergencia.dart';
import '../../models/enums.dart';
import '../../models/ficha_animal.dart';
import '../../models/termo_consentimento.dart';
import '../../models/tutor.dart';
import '../../models/veterinario_info.dart';
import '../../providers/estadias_providers.dart';

/// Cadastro e edicao de cliente: tutor + animal + ficha completa.
class TelaFormAnimal extends ConsumerStatefulWidget {
  const TelaFormAnimal({super.key, this.animalId});

  final String? animalId;

  bool get editando => animalId != null;

  @override
  ConsumerState<TelaFormAnimal> createState() => _TelaFormAnimalState();
}

class _TelaFormAnimalState extends ConsumerState<TelaFormAnimal> {
  final _formKey = GlobalKey<FormState>();

  // Tutor
  bool _novoTutor = true;
  String? _tutorId;
  final _tNome = TextEditingController();
  final _tCpf = TextEditingController();
  final _tRg = TextEditingController();
  final _tTelefone = TextEditingController();
  final _tEmail = TextEditingController();
  final _tEndereco = TextEditingController();

  // Animal
  final _aNome = TextEditingController();
  final _aRaca = TextEditingController();
  final _aIdade = TextEditingController();
  final _aPeso = TextEditingController();
  final _aObs = TextEditingController();
  PorteAnimal? _porte;
  EspecieAnimal? _especie = EspecieAnimal.canina;
  SexoAnimal? _sexo;
  bool _castrado = false;
  bool _docil = true;

  // Veterinario
  final _vNome = TextEditingController();
  final _vEspecialidade = TextEditingController();
  final _vTelefone = TextEditingController();
  final _vClinica = TextEditingController();
  final _vTelClinica = TextEditingController();
  final _vEndClinica = TextEditingController();
  bool _temEspecialidade = false;

  // Anamnese
  bool _doenca = false;
  bool _cuidados = false;
  bool _medicacao = false;
  bool _vermifugado = false;
  bool _vacinado = false;
  DateTime? _dataVermifugo;
  DateTime? _dataVacina;
  final _anDoenca = TextEditingController();
  final _anAlergias = TextEditingController();
  final _anCuidados = TextEditingController();
  final _anMedicacao = TextEditingController();
  final _anObs = TextEditingController();

  // Termo
  bool _termoAceito = false;
  DateTime? _dataAceite;
  final _localAceite = TextEditingController();

  // Contatos
  final _contatos = <_ContatoEditavel>[];

  bool _carregado = false;
  bool _salvando = false;

  @override
  void dispose() {
    for (final c in [
      _tNome, _tCpf, _tRg, _tTelefone, _tEmail, _tEndereco,
      _aNome, _aRaca, _aIdade, _aPeso, _aObs,
      _vNome, _vEspecialidade, _vTelefone, _vClinica, _vTelClinica,
      _vEndClinica,
      _anDoenca, _anAlergias, _anCuidados, _anMedicacao, _anObs,
      _localAceite,
    ]) {
      c.dispose();
    }
    for (final c in _contatos) {
      c.dispose();
    }
    super.dispose();
  }

  void _preencher(FichaAnimal f) {
    _novoTutor = false;
    _tutorId = f.tutor.id;
    _tNome.text = f.tutor.nomeCompleto;
    _tCpf.text = f.tutor.cpfCnpj ?? '';
    _tRg.text = f.tutor.rg ?? '';
    _tTelefone.text = f.tutor.telefone ?? '';
    _tEmail.text = f.tutor.email ?? '';
    _tEndereco.text = f.tutor.endereco ?? '';

    final a = f.animal;
    _aNome.text = a.nome;
    _aRaca.text = a.raca ?? '';
    _aIdade.text = a.idade?.toString() ?? '';
    _aPeso.text = a.peso?.toString() ?? '';
    _aObs.text = a.observacoes ?? '';
    _porte = a.porte;
    _especie = a.especie;
    _sexo = a.sexo;
    _castrado = a.castrado ?? false;
    _docil = a.docil ?? true;

    final v = f.veterinario;
    _vNome.text = v?.nomeVeterinario ?? '';
    _temEspecialidade = v?.temEspecialidade ?? false;
    _vEspecialidade.text = v?.qualEspecialidade ?? '';
    _vTelefone.text = v?.telefoneVeterinario ?? '';
    _vClinica.text = v?.nomeClinica ?? '';
    _vTelClinica.text = v?.telefoneClinica ?? '';
    _vEndClinica.text = v?.enderecoClinica ?? '';

    final an = f.anamnese;
    _doenca = an?.doencaPreexistente ?? false;
    _anDoenca.text = an?.doencaQual ?? '';
    _anAlergias.text = an?.alergias ?? '';
    _cuidados = an?.cuidadosEspeciais ?? false;
    _anCuidados.text = an?.cuidadosQual ?? '';
    _medicacao = an?.tomaMedicacao ?? false;
    _anMedicacao.text = an?.medicacaoQual ?? '';
    _vermifugado = an?.vermifugadoUltimoMes ?? false;
    _dataVermifugo = an?.dataVermifugo;
    _vacinado = an?.vacinadoEsteAno ?? false;
    _dataVacina = an?.dataVacinacao;
    _anObs.text = an?.observacoes ?? '';

    final t = f.termo;
    _termoAceito = t?.aceito ?? false;
    _dataAceite = t?.dataAceite;
    _localAceite.text = t?.localAceite ?? '';

    _contatos
      ..clear()
      ..addAll(f.contatos.map(_ContatoEditavel.de));

    _carregado = true;
  }

  static String? _txt(TextEditingController c) =>
      c.text.trim().isEmpty ? null : c.text.trim();

  Future<void> _salvar() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _salvando = true);
    try {
      final acoes = ref.read(acoesEstadiasProvider);

      // 1) Tutor — cria um novo ou reaproveita o selecionado.
      final tutor = await acoes.salvarTutor(
        Tutor(
          id: _novoTutor ? '' : (_tutorId ?? ''),
          nomeCompleto: _tNome.text.trim(),
          cpfCnpj: _txt(_tCpf),
          rg: _txt(_tRg),
          telefone: _txt(_tTelefone),
          email: _txt(_tEmail),
          endereco: _txt(_tEndereco),
        ),
      );

      // 2) Animal.
      final animal = await acoes.salvarAnimal(
        Animal(
          id: widget.animalId ?? '',
          tutorId: tutor.id,
          nome: _aNome.text.trim(),
          raca: _txt(_aRaca),
          idade: int.tryParse(_aIdade.text.trim()),
          porte: _porte,
          peso: num.tryParse(_aPeso.text.trim().replaceAll(',', '.')),
          especie: _especie,
          sexo: _sexo,
          castrado: _castrado,
          docil: _docil,
          observacoes: _txt(_aObs),
        ),
      );

      // 3) Ficha (veterinario, anamnese, termo, contatos).
      final temVeterinario = _vNome.text.trim().isNotEmpty ||
          _vClinica.text.trim().isNotEmpty;

      await acoes.salvarFicha(
        FichaAnimal(
          animal: animal,
          tutor: tutor,
          veterinario: temVeterinario
              ? VeterinarioInfo(
                  id: '',
                  animalId: animal.id,
                  nomeVeterinario: _txt(_vNome),
                  temEspecialidade: _temEspecialidade,
                  qualEspecialidade:
                      _temEspecialidade ? _txt(_vEspecialidade) : null,
                  telefoneVeterinario: _txt(_vTelefone),
                  nomeClinica: _txt(_vClinica),
                  telefoneClinica: _txt(_vTelClinica),
                  enderecoClinica: _txt(_vEndClinica),
                )
              : null,
          anamnese: Anamnese(
            id: '',
            animalId: animal.id,
            doencaPreexistente: _doenca,
            doencaQual: _doenca ? _txt(_anDoenca) : null,
            alergias: _txt(_anAlergias),
            cuidadosEspeciais: _cuidados,
            cuidadosQual: _cuidados ? _txt(_anCuidados) : null,
            tomaMedicacao: _medicacao,
            medicacaoQual: _medicacao ? _txt(_anMedicacao) : null,
            vermifugadoUltimoMes: _vermifugado,
            dataVermifugo: _vermifugado ? _dataVermifugo : null,
            vacinadoEsteAno: _vacinado,
            dataVacinacao: _vacinado ? _dataVacina : null,
            observacoes: _txt(_anObs),
          ),
          termo: TermoConsentimento(
            id: '',
            animalId: animal.id,
            aceito: _termoAceito,
            dataAceite: _termoAceito ? (_dataAceite ?? DateTime.now()) : null,
            localAceite: _termoAceito ? _txt(_localAceite) : null,
          ),
          contatos: [
            for (var i = 0; i < _contatos.length; i++)
              _contatos[i].paraModelo(animal.id, i + 1),
          ],
        ),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.editando ? 'Ficha atualizada.' : 'Cliente cadastrado.',
            ),
          ),
        );
        context.go('/estadias/animal/${animal.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Não foi possível salvar: $e'),
            backgroundColor: AppCores.erro,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _salvando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.editando && !_carregado) {
      final ficha = ref.watch(fichaAnimalProvider(widget.animalId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Editar cliente')),
        body: ficha.when(
          loading: () => const CarregandoCentral(),
          error: (e, _) => EstadoErro(mensagem: '$e'),
          data: (f) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _preencher(f));
            });
            return const CarregandoCentral();
          },
        ),
      );
    }

    final tutores = ref.watch(tutoresProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.editando ? 'Editar cliente' : 'Novo cliente'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/estadias'),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          children: [
            // ── Tutor ──
            _Painel(
              titulo: 'Tutor',
              icone: Icons.person_outline,
              inicialmenteAberto: true,
              children: [
                if (!widget.editando) ...[
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(value: true, label: Text('Novo tutor')),
                      ButtonSegment(
                        value: false,
                        label: Text('Tutor existente'),
                      ),
                    ],
                    selected: {_novoTutor},
                    onSelectionChanged: (s) =>
                        setState(() => _novoTutor = s.first),
                  ),
                  const SizedBox(height: 14),
                ],
                if (!_novoTutor && !widget.editando)
                  tutores.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, _) => Text('Erro: $e'),
                    data: (lista) => DropdownButtonFormField<String>(
                      initialValue: _tutorId,
                      decoration: const InputDecoration(
                        labelText: 'Selecione o tutor *',
                      ),
                      items: [
                        for (final t in lista)
                          DropdownMenuItem(
                            value: t.id,
                            child: Text(t.nomeCompleto),
                          ),
                      ],
                      onChanged: (v) {
                        final t = lista.where((x) => x.id == v).firstOrNull;
                        setState(() {
                          _tutorId = v;
                          if (t != null) {
                            _tNome.text = t.nomeCompleto;
                            _tCpf.text = t.cpfCnpj ?? '';
                            _tRg.text = t.rg ?? '';
                            _tTelefone.text = t.telefone ?? '';
                            _tEmail.text = t.email ?? '';
                            _tEndereco.text = t.endereco ?? '';
                          }
                        });
                      },
                      validator: (v) =>
                          v == null ? 'Selecione um tutor' : null,
                    ),
                  )
                else ...[
                  _Campo(
                    controlador: _tNome,
                    rotulo: 'Nome completo *',
                    obrigatorio: true,
                  ),
                  // Obrigatorio no app por decisao de negocio; a coluna
                  // aceita nulo no banco.
                  _Campo(
                    controlador: _tCpf,
                    rotulo: 'CPF/CNPJ *',
                    obrigatorio: true,
                  ),
                  _Campo(controlador: _tRg, rotulo: 'RG'),
                  _Campo(
                    controlador: _tTelefone,
                    rotulo: 'Telefone',
                    teclado: TextInputType.phone,
                  ),
                  _Campo(
                    controlador: _tEmail,
                    rotulo: 'E-mail',
                    teclado: TextInputType.emailAddress,
                  ),
                  _Campo(controlador: _tEndereco, rotulo: 'Endereço'),
                ],
              ],
            ),

            // ── Animal ──
            _Painel(
              titulo: 'Animal',
              icone: Icons.pets,
              inicialmenteAberto: true,
              children: [
                _Campo(
                  controlador: _aNome,
                  rotulo: 'Nome *',
                  obrigatorio: true,
                ),
                _Campo(controlador: _aRaca, rotulo: 'Raça'),
                Row(
                  children: [
                    Expanded(
                      child: _Campo(
                        controlador: _aIdade,
                        rotulo: 'Idade (anos)',
                        teclado: TextInputType.number,
                        validador: (v) {
                          if (v == null || v.trim().isEmpty) return null;
                          return int.tryParse(v.trim()) == null
                              ? 'Informe um número'
                              : null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _Campo(
                        controlador: _aPeso,
                        rotulo: 'Peso (kg)',
                        teclado: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                DropdownButtonFormField<EspecieAnimal>(
                  initialValue: _especie,
                  decoration: const InputDecoration(labelText: 'Espécie'),
                  items: [
                    for (final e in EspecieAnimal.values)
                      DropdownMenuItem(value: e, child: Text(e.rotulo)),
                  ],
                  onChanged: (v) => setState(() => _especie = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<PorteAnimal>(
                  initialValue: _porte,
                  decoration: const InputDecoration(labelText: 'Porte'),
                  items: [
                    for (final p in PorteAnimal.values)
                      DropdownMenuItem(value: p, child: Text(p.rotulo)),
                  ],
                  onChanged: (v) => setState(() => _porte = v),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<SexoAnimal>(
                  initialValue: _sexo,
                  decoration: const InputDecoration(labelText: 'Sexo'),
                  items: [
                    for (final s in SexoAnimal.values)
                      DropdownMenuItem(value: s, child: Text(s.rotulo)),
                  ],
                  onChanged: (v) => setState(() => _sexo = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Castrado'),
                  value: _castrado,
                  onChanged: (v) => setState(() => _castrado = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Dócil'),
                  value: _docil,
                  onChanged: (v) => setState(() => _docil = v),
                ),
                TextFormField(
                  controller: _aObs,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Observações'),
                ),
              ],
            ),

            // ── Veterinario ──
            _Painel(
              titulo: 'Veterinário',
              icone: Icons.local_hospital_outlined,
              children: [
                _Campo(controlador: _vNome, rotulo: 'Nome do veterinário'),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Possui especialidade'),
                  value: _temEspecialidade,
                  onChanged: (v) => setState(() => _temEspecialidade = v),
                ),
                if (_temEspecialidade)
                  _Campo(
                    controlador: _vEspecialidade,
                    rotulo: 'Qual especialidade',
                  ),
                _Campo(
                  controlador: _vTelefone,
                  rotulo: 'Telefone do veterinário',
                  teclado: TextInputType.phone,
                ),
                _Campo(controlador: _vClinica, rotulo: 'Nome da clínica'),
                _Campo(
                  controlador: _vTelClinica,
                  rotulo: 'Telefone da clínica',
                  teclado: TextInputType.phone,
                ),
                _Campo(
                  controlador: _vEndClinica,
                  rotulo: 'Endereço da clínica',
                ),
              ],
            ),

            // ── Contatos de emergencia ──
            _Painel(
              titulo: 'Contatos de emergência',
              icone: Icons.contact_phone_outlined,
              children: [
                for (var i = 0; i < _contatos.length; i++)
                  _LinhaContato(
                    contato: _contatos[i],
                    ordem: i + 1,
                    aoRemover: () => setState(() {
                      _contatos.removeAt(i).dispose();
                    }),
                  ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: () =>
                      setState(() => _contatos.add(_ContatoEditavel())),
                  icon: const Icon(Icons.add),
                  label: const Text('Adicionar contato'),
                ),
              ],
            ),

            // ── Anamnese ──
            _Painel(
              titulo: 'Anamnese',
              icone: Icons.medical_information_outlined,
              children: [
                _SwitchComCampo(
                  titulo: 'Doença preexistente',
                  valor: _doenca,
                  aoAlterar: (v) => setState(() => _doenca = v),
                  controlador: _anDoenca,
                  rotuloCampo: 'Qual doença',
                ),
                _Campo(controlador: _anAlergias, rotulo: 'Alergias'),
                _SwitchComCampo(
                  titulo: 'Cuidados especiais',
                  valor: _cuidados,
                  aoAlterar: (v) => setState(() => _cuidados = v),
                  controlador: _anCuidados,
                  rotuloCampo: 'Quais cuidados',
                ),
                _SwitchComCampo(
                  titulo: 'Toma medicação',
                  valor: _medicacao,
                  aoAlterar: (v) => setState(() => _medicacao = v),
                  controlador: _anMedicacao,
                  rotuloCampo: 'Qual medicação',
                ),
                _SwitchComData(
                  titulo: 'Vermifugado no último mês',
                  valor: _vermifugado,
                  aoAlterar: (v) => setState(() => _vermifugado = v),
                  data: _dataVermifugo,
                  aoAlterarData: (d) => setState(() => _dataVermifugo = d),
                  rotuloData: 'Data do vermífugo',
                ),
                _SwitchComData(
                  titulo: 'Vacinado este ano',
                  valor: _vacinado,
                  aoAlterar: (v) => setState(() => _vacinado = v),
                  data: _dataVacina,
                  aoAlterarData: (d) => setState(() => _dataVacina = d),
                  rotuloData: 'Data da vacinação',
                ),
                TextFormField(
                  controller: _anObs,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Observações da anamnese',
                  ),
                ),
              ],
            ),

            // ── Termo ──
            _Painel(
              titulo: 'Termo de consentimento',
              icone: Icons.assignment_turned_in_outlined,
              children: [
                const Text(
                  'Registro informativo. Os itens do termo são conferência '
                  'manual da equipe e não bloqueiam agendamentos.',
                  style: TextStyle(fontSize: 12, color: AppCores.textoSuave),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Termo aceito'),
                  value: _termoAceito,
                  onChanged: (v) => setState(() => _termoAceito = v),
                ),
                if (_termoAceito) ...[
                  _SeletorData(
                    rotulo: 'Data do aceite',
                    valor: _dataAceite,
                    aoAlterar: (d) => setState(() => _dataAceite = d),
                  ),
                  const SizedBox(height: 12),
                  _Campo(controlador: _localAceite, rotulo: 'Local do aceite'),
                ],
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
            label: Text(widget.editando ? 'Salvar alterações' : 'Cadastrar'),
          ),
        ),
      ),
    );
  }
}

// ── Widgets auxiliares ──────────────────────────────────────────────────────

class _Painel extends StatelessWidget {
  const _Painel({
    required this.titulo,
    required this.icone,
    required this.children,
    this.inicialmenteAberto = false,
  });

  final String titulo;
  final IconData icone;
  final List<Widget> children;
  final bool inicialmenteAberto;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: inicialmenteAberto,
          shape: const Border(),
          leading: Icon(icone, color: AppCores.primaria),
          title: Text(
            titulo,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: AppCores.primariaEscura,
            ),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: children,
        ),
      ),
    );
  }
}

class _Campo extends StatelessWidget {
  const _Campo({
    required this.controlador,
    required this.rotulo,
    this.obrigatorio = false,
    this.teclado,
    this.validador,
  });

  final TextEditingController controlador;
  final String rotulo;
  final bool obrigatorio;
  final TextInputType? teclado;
  final String? Function(String?)? validador;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: controlador,
        keyboardType: teclado,
        decoration: InputDecoration(labelText: rotulo),
        validator: validador ??
            (obrigatorio
                ? (v) => (v == null || v.trim().isEmpty)
                      ? 'Campo obrigatório'
                      : null
                : null),
      ),
    );
  }
}

class _SwitchComCampo extends StatelessWidget {
  const _SwitchComCampo({
    required this.titulo,
    required this.valor,
    required this.aoAlterar,
    required this.controlador,
    required this.rotuloCampo,
  });

  final String titulo;
  final bool valor;
  final ValueChanged<bool> aoAlterar;
  final TextEditingController controlador;
  final String rotuloCampo;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(titulo),
          value: valor,
          onChanged: aoAlterar,
        ),
        if (valor) _Campo(controlador: controlador, rotulo: rotuloCampo),
      ],
    );
  }
}

class _SwitchComData extends StatelessWidget {
  const _SwitchComData({
    required this.titulo,
    required this.valor,
    required this.aoAlterar,
    required this.data,
    required this.aoAlterarData,
    required this.rotuloData,
  });

  final String titulo;
  final bool valor;
  final ValueChanged<bool> aoAlterar;
  final DateTime? data;
  final ValueChanged<DateTime> aoAlterarData;
  final String rotuloData;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(titulo),
          value: valor,
          onChanged: aoAlterar,
        ),
        if (valor)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _SeletorData(
              rotulo: rotuloData,
              valor: data,
              aoAlterar: aoAlterarData,
            ),
          ),
      ],
    );
  }
}

class _SeletorData extends StatelessWidget {
  const _SeletorData({
    required this.rotulo,
    required this.valor,
    required this.aoAlterar,
  });

  final String rotulo;
  final DateTime? valor;
  final ValueChanged<DateTime> aoAlterar;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        final agora = DateTime.now();
        final d = await showDatePicker(
          context: context,
          initialDate: valor ?? agora,
          firstDate: DateTime(agora.year - 20),
          lastDate: DateTime(agora.year + 5),
          locale: const Locale('pt', 'BR'),
        );
        if (d != null) aoAlterar(d);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: rotulo,
          suffixIcon: const Icon(Icons.calendar_today, size: 18),
        ),
        child: Text(
          valor == null ? 'Selecionar' : Formatadores.data.format(valor!),
        ),
      ),
    );
  }
}

/// Estado editavel de um contato de emergencia no formulario.
class _ContatoEditavel {
  _ContatoEditavel();

  factory _ContatoEditavel.de(ContatoEmergencia c) {
    final e = _ContatoEditavel();
    e.nome.text = c.nome ?? '';
    e.parentesco.text = c.parentesco ?? '';
    e.telefone.text = c.telefone ?? '';
    return e;
  }

  final nome = TextEditingController();
  final parentesco = TextEditingController();
  final telefone = TextEditingController();

  ContatoEmergencia paraModelo(String animalId, int ordem) =>
      ContatoEmergencia(
        id: '',
        animalId: animalId,
        nome: nome.text.trim().isEmpty ? null : nome.text.trim(),
        parentesco: parentesco.text.trim().isEmpty
            ? null
            : parentesco.text.trim(),
        telefone: telefone.text.trim().isEmpty ? null : telefone.text.trim(),
        ordem: ordem,
      );

  void dispose() {
    nome.dispose();
    parentesco.dispose();
    telefone.dispose();
  }
}

class _LinhaContato extends StatelessWidget {
  const _LinhaContato({
    required this.contato,
    required this.ordem,
    required this.aoRemover,
  });

  final _ContatoEditavel contato;
  final int ordem;
  final VoidCallback aoRemover;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppCores.neutraClara,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: AppCores.acento,
                child: Text(
                  '$ordem',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppCores.primariaEscura,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              const Expanded(child: Text('Contato')),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppCores.erro),
                onPressed: aoRemover,
              ),
            ],
          ),
          _Campo(controlador: contato.nome, rotulo: 'Nome'),
          _Campo(controlador: contato.parentesco, rotulo: 'Parentesco'),
          _Campo(
            controlador: contato.telefone,
            rotulo: 'Telefone',
            teclado: TextInputType.phone,
          ),
        ],
      ),
    );
  }
}
