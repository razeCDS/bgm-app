import { useLocalSearchParams } from 'expo-router';

import { VisaoFichaAnimal } from '../../../../src/features/estadias/components/ficha-animal';

export default function FichaAnimalRota() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VisaoFichaAnimal animalId={id} />;
}
