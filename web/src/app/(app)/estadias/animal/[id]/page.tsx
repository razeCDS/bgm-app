import type { Metadata } from 'next';

import { Cabecalho } from '@/components/cabecalho';
import { VisaoFichaAnimal } from '@/features/estadias/components/ficha-animal';

export const metadata: Metadata = { title: 'Ficha' };

export default async function PaginaFichaAnimal(
  props: PageProps<'/estadias/animal/[id]'>,
) {
  const { id } = await props.params;
  return (
    <>
      <Cabecalho titulo="Ficha" voltarPara="/estadias/clientes" />
      <VisaoFichaAnimal animalId={id} />
    </>
  );
}
