'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { DialogoProvider } from '@/components/dialogo';
import { useRegistrarNavegacao } from '@/lib/navegacao';

/**
 * Tudo que precisa de estado no navegador, pendurado no layout raiz.
 *
 * O `QueryClient` nasce dentro de `useState`, e nao no escopo do modulo
 * como no mobile: no servidor, um cliente de modulo seria compartilhado
 * entre as requisicoes de todos os usuarios — o cache de um vazaria para o
 * outro. Com `useState`, cada montagem tem o seu.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [clienteQuery] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );
  useRegistrarNavegacao();

  return (
    <QueryClientProvider client={clienteQuery}>
      <DialogoProvider>{children}</DialogoProvider>
    </QueryClientProvider>
  );
}
