import { Botao } from './botoes';
import { Spinner } from './spinner';

export function Carregando() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <span className="scale-150">
        <Spinner />
      </span>
    </div>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: string;
  titulo: string;
  descricao?: string;
  acao?: { texto: string; aoTocar: () => void };
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="mb-3 text-5xl">{icone}</span>
      <p className="text-[17px] font-semibold text-texto-escuro">{titulo}</p>
      {descricao ? <p className="mt-1.5 text-texto-suave">{descricao}</p> : null}
      {acao ? (
        <Botao variante="secundario" className="mt-5" onClick={acao.aoTocar}>
          {acao.texto}
        </Botao>
      ) : null}
    </div>
  );
}

export function EstadoErro({
  mensagem,
  aoTentarNovamente,
}: {
  mensagem: string;
  aoTentarNovamente?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="mb-3 text-5xl">⚠️</span>
      <p className="text-[17px] font-semibold text-texto-escuro">
        Algo deu errado
      </p>
      <p className="mt-1.5 text-texto-suave">{mensagem}</p>
      {aoTentarNovamente ? (
        <Botao variante="secundario" className="mt-5" onClick={aoTentarNovamente}>
          Tentar novamente
        </Botao>
      ) : null}
    </div>
  );
}
