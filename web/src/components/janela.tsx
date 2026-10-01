'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Janela modal sobre o `<dialog>` nativo — substitui o `Modal` do mobile.
 *
 * O `<dialog>` aberto com `showModal()` ja resolve o que antes era manual:
 * fundo escurecido, foco preso dentro da janela e ESC para fechar. Toque no
 * fundo tambem fecha (o clique chega no proprio `<dialog>`, e nao no
 * conteudo — por isso o padding fica na `div` de dentro).
 */
export function Janela({
  aberto,
  aoFechar,
  titulo,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
      // O reset do Tailwind zera a margem de tudo — inclusive o `margin:
      // auto` que centraliza o <dialog>. Por isso o `m-auto` explicito.
      className="m-auto w-[calc(100%-3rem)] max-w-md rounded-xl bg-white p-0 text-texto-escuro shadow-xl backdrop:bg-black/40"
    >
      <div className="flex max-h-[70dvh] flex-col p-4">
        {titulo ? (
          <h2 className="mb-3 text-base font-bold text-primaria-escura">
            {titulo}
          </h2>
        ) : null}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
