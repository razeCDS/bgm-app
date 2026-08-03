import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/formatadores.dart';
import '../../../../core/theme/app_cores.dart';
import '../../../../shared/widgets/estado_lista.dart';
import '../../models/ficha_animal.dart';
import '../../providers/estadias_providers.dart';

/// Ficha completa do animal: dados do animal, tutor, veterinario,
/// contatos de emergencia, anamnese e termo de consentimento.
class TelaFichaAnimal extends ConsumerWidget {
  const TelaFichaAnimal({super.key, required this.animalId});

  final String animalId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ficha = ref.watch(fichaAnimalProvider(animalId));

    return Scaffold(
      appBar: AppBar(
        title: Text(ficha.value?.animal.nome ?? 'Ficha'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/estadias'),
        ),
        actions: [
          IconButton(
            tooltip: 'Editar',
            icon: const Icon(Icons.edit),
            onPressed: () => context.go('/estadias/animal/$animalId/editar'),
          ),
        ],
      ),
      body: ficha.when(
        loading: () => const CarregandoCentral(),
        error: (e, _) => EstadoErro(
          mensagem: '$e',
          aoTentarNovamente: () =>
              ref.invalidate(fichaAnimalProvider(animalId)),
        ),
        data: (f) => _Conteudo(ficha: f),
      ),
    );
  }
}

class _Conteudo extends StatelessWidget {
  const _Conteudo({required this.ficha});

  final FichaAnimal ficha;

  @override
  Widget build(BuildContext context) {
    final a = ficha.animal;
    final v = ficha.veterinario;
    final an = ficha.anamnese;
    final t = ficha.termo;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _Bloco(
          titulo: 'Animal',
          icone: Icons.pets,
          linhas: [
            ('Nome', a.nome),
            ('Raça', a.raca),
            ('Espécie', a.especie?.rotulo),
            ('Porte', a.porte?.rotulo),
            ('Sexo', a.sexo?.rotulo),
            ('Idade', a.idade == null ? null : '${a.idade} ano(s)'),
            ('Peso', a.peso == null ? null : '${a.peso} kg'),
            ('Castrado', _sn(a.castrado)),
            ('Dócil', _sn(a.docil)),
            ('Observações', a.observacoes),
          ],
        ),
        _Bloco(
          titulo: 'Tutor',
          icone: Icons.person_outline,
          linhas: [
            ('Nome', ficha.tutor.nomeCompleto),
            ('CPF/CNPJ', ficha.tutor.cpfCnpj),
            ('RG', ficha.tutor.rg),
            ('Telefone', ficha.tutor.telefone),
            ('E-mail', ficha.tutor.email),
            ('Endereço', ficha.tutor.endereco),
          ],
        ),
        _Bloco(
          titulo: 'Veterinário',
          icone: Icons.local_hospital_outlined,
          vazio: v == null,
          textoVazio: 'Nenhuma informação de veterinário cadastrada.',
          linhas: [
            ('Veterinário', v?.nomeVeterinario),
            ('Especialidade', (v?.temEspecialidade ?? false)
                ? v?.qualEspecialidade
                : null),
            ('Telefone', v?.telefoneVeterinario),
            ('Clínica', v?.nomeClinica),
            ('Telefone da clínica', v?.telefoneClinica),
            ('Endereço da clínica', v?.enderecoClinica),
          ],
        ),
        _BlocoContatos(ficha: ficha),
        _Bloco(
          titulo: 'Anamnese',
          icone: Icons.medical_information_outlined,
          vazio: an == null,
          textoVazio: 'Anamnese ainda não preenchida.',
          linhas: [
            ('Doença preexistente', (an?.doencaPreexistente ?? false)
                ? (an?.doencaQual ?? 'Sim')
                : _sn(an?.doencaPreexistente)),
            ('Alergias', an?.alergias),
            ('Cuidados especiais', (an?.cuidadosEspeciais ?? false)
                ? (an?.cuidadosQual ?? 'Sim')
                : _sn(an?.cuidadosEspeciais)),
            ('Medicação', (an?.tomaMedicacao ?? false)
                ? (an?.medicacaoQual ?? 'Sim')
                : _sn(an?.tomaMedicacao)),
            ('Vermifugado no último mês', _sn(an?.vermifugadoUltimoMes)),
            ('Data do vermífugo', Formatadores.dataOuNulo(an?.dataVermifugo)),
            ('Vacinado este ano', _sn(an?.vacinadoEsteAno)),
            ('Data da vacinação', Formatadores.dataOuNulo(an?.dataVacinacao)),
            ('Observações', an?.observacoes),
          ],
        ),
        _Bloco(
          titulo: 'Termo de consentimento',
          icone: Icons.assignment_turned_in_outlined,
          vazio: t == null,
          textoVazio: 'Termo ainda não registrado.',
          rodape: const Padding(
            padding: EdgeInsets.only(top: 10),
            child: Text(
              'Os itens do termo (vacinas, vermífugo, antipulgas, castração) '
              'são conferência manual da equipe e não bloqueiam agendamentos.',
              style: TextStyle(fontSize: 12, color: AppCores.textoSuave),
            ),
          ),
          linhas: [
            ('Aceito', _sn(t?.aceito)),
            ('Data do aceite', Formatadores.dataOuNulo(t?.dataAceite)),
            ('Local', t?.localAceite),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  static String? _sn(bool? v) => v == null ? null : (v ? 'Sim' : 'Não');
}

class _Bloco extends StatelessWidget {
  const _Bloco({
    required this.titulo,
    required this.icone,
    required this.linhas,
    this.vazio = false,
    this.textoVazio,
    this.rodape,
  });

  final String titulo;
  final IconData icone;
  final List<(String, String?)> linhas;
  final bool vazio;
  final String? textoVazio;
  final Widget? rodape;

  @override
  Widget build(BuildContext context) {
    final preenchidas =
        linhas.where((l) => l.$2 != null && l.$2!.isNotEmpty).toList();

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icone, size: 20, color: AppCores.primaria),
                const SizedBox(width: 8),
                Text(
                  titulo,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppCores.primariaEscura,
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            if (vazio || preenchidas.isEmpty)
              Text(
                textoVazio ?? 'Sem informações.',
                style: const TextStyle(color: AppCores.textoSuave),
              )
            else
              for (final (rotulo, valor) in preenchidas)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 130,
                        child: Text(
                          rotulo,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppCores.textoSuave,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          valor!,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ),
            ?rodape,
          ],
        ),
      ),
    );
  }
}

class _BlocoContatos extends StatelessWidget {
  const _BlocoContatos({required this.ficha});

  final FichaAnimal ficha;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.contact_phone_outlined,
                  size: 20,
                  color: AppCores.primaria,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Contatos de emergência',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppCores.primariaEscura,
                  ),
                ),
                const Spacer(),
                if (ficha.contatos.isNotEmpty)
                  Text(
                    '${ficha.contatos.length}',
                    style: const TextStyle(color: AppCores.textoSuave),
                  ),
              ],
            ),
            const Divider(height: 20),
            if (ficha.contatos.isEmpty)
              const Text(
                'Nenhum contato cadastrado.',
                style: TextStyle(color: AppCores.textoSuave),
              )
            else
              for (final c in ficha.contatos)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppCores.acento,
                        child: Text(
                          '${c.ordem ?? 0}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppCores.primariaEscura,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              c.nome ?? '—',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              [
                                if (c.parentesco != null) c.parentesco,
                                if (c.telefone != null) c.telefone,
                              ].whereType<String>().join(' · '),
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppCores.textoSuave,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
