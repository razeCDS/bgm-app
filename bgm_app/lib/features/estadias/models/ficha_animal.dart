import 'anamnese.dart';
import 'animal.dart';
import 'contato_emergencia.dart';
import 'termo_consentimento.dart';
import 'tutor.dart';
import 'veterinario_info.dart';

/// Agregado exibido na ficha completa do animal.
class FichaAnimal {
  const FichaAnimal({
    required this.animal,
    required this.tutor,
    this.veterinario,
    this.anamnese,
    this.termo,
    this.contatos = const [],
  });

  final Animal animal;
  final Tutor tutor;
  final VeterinarioInfo? veterinario;
  final Anamnese? anamnese;
  final TermoConsentimento? termo;
  final List<ContatoEmergencia> contatos;

  FichaAnimal copyWith({
    Animal? animal,
    Tutor? tutor,
    VeterinarioInfo? veterinario,
    Anamnese? anamnese,
    TermoConsentimento? termo,
    List<ContatoEmergencia>? contatos,
  }) => FichaAnimal(
    animal: animal ?? this.animal,
    tutor: tutor ?? this.tutor,
    veterinario: veterinario ?? this.veterinario,
    anamnese: anamnese ?? this.anamnese,
    termo: termo ?? this.termo,
    contatos: contatos ?? this.contatos,
  );
}
