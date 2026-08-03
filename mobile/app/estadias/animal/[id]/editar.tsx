import { useLocalSearchParams } from 'expo-router';

import { FormAnimal } from '../../../../src/features/estadias/components/form-animal';

export default function EditarAnimal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FormAnimal animalId={id} />;
}
