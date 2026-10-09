'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Botao } from './botoes';
import { Janela } from './janela';

/**
 * Substituto do `Alert.alert` do React Native, que nao existe na web.
 *
 * Em vez de botoes com callback, devolve uma Promise — o fluxo fica linear:
 *
 *   if (await confirmar({ ... })) { await cancelar(...); }
 *
 * O `window.confirm` nativo faria o mesmo, mas trava a pagina, nao segue a
 * identidade visual e nao distingue acao destrutiva.
 */
interface OpcoesConfirmar {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  textoVoltar?: string;
  destrutivo?: boolean;
}

interface Pedido {
  titulo: string;
  mensagem: string;
  /** `null` = aviso simples, so com "OK". */
  confirmar: Omit<OpcoesConfirmar, 'titulo' | 'mensagem'> | null;
  resolver: (confirmou: boolean) => void;
}

interface ApiDialogo {
  avisar: (titulo: string, mensagem: string) => Promise<void>;
  confirmar: (opcoes: OpcoesConfirmar) => Promise<boolean>;
}

const Contexto = createContext<ApiDialogo | null>(null);

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const api = useMemo<ApiDialogo>(
    () => ({
      avisar: (titulo, mensagem) =>
        new Promise<void>((resolver) =>
          setPedido({ titulo, mensagem, confirmar: null, resolver: () => resolver() }),
        ),
      confirmar: ({ titulo, mensagem, ...confirmar }) =>
        new Promise<boolean>((resolver) =>
          setPedido({ titulo, mensagem, confirmar, resolver }),
        ),
    }),
    [],
  );

  function responder(confirmou: boolean) {
    pedido?.resolver(confirmou);
    setPedido(null);
  }

  return (
    <Contexto.Provider value={api}>
      {children}
      <Janela
        aberto={!!pedido}
        aoFechar={() => responder(false)}
        titulo={pedido?.titulo}
      >
        <p className="text-[15px] text-texto-escuro">{pedido?.mensagem}</p>
        <div className="mt-5 flex justify-end gap-2">
          {pedido?.confirmar ? (
            <>
              <Botao variante="secundario" onClick={() => responder(false)}>
                {pedido.confirmar.textoVoltar ?? 'Voltar'}
              </Botao>
              <Botao
                variante={pedido.confirmar.destrutivo ? 'perigo' : 'primario'}
                onClick={() => responder(true)}
              >
                {pedido.confirmar.textoConfirmar}
              </Botao>
            </>
          ) : (
            <Botao onClick={() => responder(true)}>OK</Botao>
          )}
        </div>
      </Janela>
    </Contexto.Provider>
  );
}

export function useDialogo(): ApiDialogo {
  const api = useContext(Contexto);
  if (!api) throw new Error('useDialogo precisa estar dentro de <DialogoProvider>.');
  return api;
}
