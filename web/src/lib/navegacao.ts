'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * "Voltar" seguro para um app instalado.
 *
 * No PWA em modo standalone nao existe barra do navegador — o botao de
 * voltar do cabecalho e o unico caminho de volta. So que `router.back()`
 * numa pagina aberta direto (link, atalho, recarregar) sairia do app.
 *
 * Por isso registramos se ja houve navegacao DENTRO do app nesta aba: se
 * houve, voltar e seguro; se nao, vamos para uma rota conhecida.
 */
let navegouNoApp = false;

/** Use uma vez, no topo da arvore (Providers). */
export function useRegistrarNavegacao() {
  const caminho = usePathname();
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    navegouNoApp = true;
  }, [caminho]);
}

export function useVoltar(alternativa: string) {
  const router = useRouter();
  return () => {
    if (navegouNoApp) router.back();
    else router.replace(alternativa);
  };
}
