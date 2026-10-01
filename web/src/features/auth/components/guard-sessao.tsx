'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Carregando } from '../../../components/estados';
import { useSessao } from '../store';

/**
 * Guard do lado do navegador, envolvendo todas as telas logadas.
 *
 * O `proxy.ts` ja barra quem chega sem sessao — mas so no momento em que a
 * pagina e pedida ao servidor. Este guard cobre o que acontece DEPOIS, com
 * a pagina aberta: sair, token expirado, ou o modo em memoria (onde a
 * sessao so existe no navegador e o proxy nao tem o que verificar).
 *
 * De proposito, a tela de login NAO redireciona sozinha quem parece logado:
 * se o navegador e o proxy discordassem sobre a sessao (cookie vencido, por
 * exemplo), um mandaria para "/" e o outro de volta para "/login", em loop.
 * Quem decide isso e so o proxy.
 */
export function GuardSessao({ children }: { children: ReactNode }) {
  const { usuario, pronto, carregar } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (!pronto) void carregar();
  }, [pronto, carregar]);

  useEffect(() => {
    if (pronto && !usuario) router.replace('/login');
  }, [pronto, usuario, router]);

  // Tambem e o que o servidor renderiza: la a sessao nunca esta "pronta",
  // entao o HTML inicial e o primeiro render do navegador batem.
  if (!pronto || !usuario) {
    return (
      <div className="flex min-h-dvh">
        <Carregando />
      </div>
    );
  }

  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
