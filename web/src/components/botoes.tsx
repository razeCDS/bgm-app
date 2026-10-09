import type { ButtonHTMLAttributes } from 'react';

import { Spinner } from './spinner';

/**
 * Botoes do app — substituem `estilos.botaoPrimario/Secundario` do mobile.
 *
 * No Tailwind o reaproveitamento e por componente, e nao por classe com
 * nome: as classes ficam aqui dentro, e as telas usam `<Botao>`.
 */
type Variante = 'primario' | 'secundario' | 'perigo';

const classes: Record<Variante, string> = {
  primario: 'bg-primaria text-white hover:bg-primaria-escura',
  secundario: 'border border-primaria text-primaria hover:bg-primaria/8',
  perigo: 'border border-erro text-erro hover:bg-erro/8',
};

export function Botao({
  variante = 'primario',
  carregando,
  disabled,
  className = '',
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  carregando?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={`flex items-center justify-center gap-2 rounded-campo px-5 py-3.5 text-[15px] font-semibold transition-colors disabled:opacity-50 ${classes[variante]} ${className}`}
      {...resto}
    >
      {carregando ? <Spinner claro={variante === 'primario'} /> : children}
    </button>
  );
}

/**
 * Botao flutuante ("+ Novo") — no mobile era o FAB. O `bottom` soma a area
 * segura do iPhone, senao o botao fica embaixo da barra de gestos no PWA.
 */
export const classesFab =
  'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 rounded-full bg-acento px-5 py-3.5 text-[15px] font-bold text-primaria-escura shadow-lg shadow-black/20 transition-transform active:scale-95';
