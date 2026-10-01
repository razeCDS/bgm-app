import type { Metadata } from 'next';

import { Cabecalho } from '@/components/cabecalho';
import { FormAnimal } from '@/features/estadias/components/form-animal';

export const metadata: Metadata = { title: 'Editar cliente' };

export default async function PaginaEditarAnimal(
  props: PageProps<'/estadias/animal/[id]/editar'>,
) {
  const { id } = await props.params;
  return (
    <>
      <Cabecalho titulo="Editar cliente" voltarPara={`/estadias/animal/${id}`} />
      <FormAnimal animalId={id} />
    </>
  );
}
