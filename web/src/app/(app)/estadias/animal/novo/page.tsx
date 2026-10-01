import type { Metadata } from 'next';

import { Cabecalho } from '@/components/cabecalho';
import { FormAnimal } from '@/features/estadias/components/form-animal';

export const metadata: Metadata = { title: 'Novo cliente' };

export default function PaginaNovoAnimal() {
  return (
    <>
      <Cabecalho titulo="Novo cliente" voltarPara="/estadias/clientes" />
      <FormAnimal />
    </>
  );
}
