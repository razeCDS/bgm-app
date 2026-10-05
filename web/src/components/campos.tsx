'use client';

import { useId, useState, type ReactNode } from 'react';

import {
  deInputData,
  deInputDataHora,
  paraInputData,
  paraInputDataHora,
} from '../lib/datas-input';

/*
 * Caixa visual compartilhada pelos campos.
 *
 * `text-base` (16px) nao e estetica: o Safari do iPhone da zoom na pagina
 * ao focar qualquer campo com fonte menor que 16px — e nao desfaz sozinho.
 */
const caixa =
  'w-full rounded-campo bg-neutra-clara px-3.5 py-3 text-base text-texto-escuro outline-none placeholder:text-texto-suave focus:ring-2 focus:ring-primaria/40 disabled:opacity-85';

export function Rotulo({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs text-texto-suave">
      {children}
    </label>
  );
}

export function Dica({ children }: { children: ReactNode }) {
  return <p className="text-xs text-texto-suave">{children}</p>;
}

// ── Texto ─────────────────────────────────────────────────────────────────

/**
 * Qual teclado o celular abre. Numeros usam `type="text"` + `inputMode`, e
 * nao `type="number"`: este ultimo rejeita a virgula decimal do pt-BR
 * ("12,50"), que as telas ja convertem por conta propria.
 */
type Teclado = 'numerico' | 'decimal' | 'telefone' | 'email';

const atributosTeclado = {
  numerico: { type: 'text', inputMode: 'numeric' },
  decimal: { type: 'text', inputMode: 'decimal' },
  telefone: { type: 'tel', inputMode: 'tel' },
  email: { type: 'email', inputMode: 'email' },
} as const;

export function Campo({
  rotulo,
  valor,
  aoMudar,
  teclado,
  multilinha,
  prefixo,
  erro,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  teclado?: Teclado;
  multilinha?: boolean;
  prefixo?: string;
  erro?: string | null;
  placeholder?: string;
}) {
  const id = useId();
  const classes = `${caixa} ${prefixo ? 'pl-10' : ''} ${erro ? 'ring-1 ring-erro' : ''}`;

  return (
    <div className="mb-3.5">
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <div className="relative">
        {prefixo ? (
          <span className="pointer-events-none absolute top-3 left-3.5 text-texto-suave">
            {prefixo}
          </span>
        ) : null}
        {multilinha ? (
          <textarea
            id={id}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`${classes} min-h-20 resize-y`}
          />
        ) : (
          <input
            id={id}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            placeholder={placeholder}
            {...(teclado ? atributosTeclado[teclado] : { type: 'text' })}
            className={classes}
          />
        )}
      </div>
      {erro ? <p className="mt-1 text-xs text-erro">{erro}</p> : null}
    </div>
  );
}

// ── Selecao ───────────────────────────────────────────────────────────────

/**
 * Lista de opcoes sobre o `<select>` nativo. No mobile era um modal feito a
 * mao porque o React Native nao tem dropdown; no navegador do celular o
 * `<select>` abre o seletor do proprio sistema, que e melhor que qualquer
 * imitacao.
 */
export function Seletor<T extends string>({
  rotulo,
  valor,
  opcoes,
  rotuloDe,
  aoSelecionar,
  permiteVazio,
  textoVazio = 'Todos',
  bloqueado,
  dicaBloqueio,
}: {
  rotulo: string;
  valor: T | null;
  opcoes: readonly T[];
  rotuloDe: (v: T) => string;
  aoSelecionar: (v: T | null) => void;
  permiteVazio?: boolean;
  textoVazio?: string;
  /** Somente leitura: mostra o valor, mas nao abre a lista. */
  bloqueado?: boolean;
  dicaBloqueio?: string;
}) {
  const id = useId();

  return (
    <div className="mb-3.5">
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <div className="relative">
        <select
          id={id}
          value={valor ?? ''}
          disabled={bloqueado}
          onChange={(e) =>
            aoSelecionar(e.target.value === '' ? null : (e.target.value as T))
          }
          className={`${caixa} appearance-none pr-9 ${valor ? '' : 'text-texto-suave'} ${
            bloqueado ? 'text-texto-suave' : ''
          }`}
        >
          {permiteVazio ? (
            <option value="">{textoVazio}</option>
          ) : (
            <option value="" disabled hidden>
              Selecionar
            </option>
          )}
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {rotuloDe(o)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute top-3 right-3.5 text-sm text-texto-suave">
          {bloqueado ? '🔒' : '▾'}
        </span>
      </div>
      {bloqueado && dicaBloqueio ? (
        <p className="mt-1 text-xs text-texto-suave">{dicaBloqueio}</p>
      ) : null}
    </div>
  );
}

// ── Data / hora ───────────────────────────────────────────────────────────

/**
 * Texto do input sincronizado com o valor de fora.
 *
 * Os inputs de data e hora so reportam valor quando ele esta COMPLETO —
 * enquanto se digita "1_/__/____" no computador, o valor e "". Se o input
 * fosse controlado direto pelo `Date` do pai, o React desfaria cada tecla
 * (o pai nao mudou, entao ele restaura o valor antigo). Guardamos o texto
 * localmente e so avisamos o pai quando ele vira uma data valida.
 */
function useTextoSincronizado(externo: string) {
  const [texto, setTexto] = useState(externo);
  const [anterior, setAnterior] = useState(externo);
  if (externo !== anterior) {
    // Ajuste de estado durante o render: o padrao do React para derivar
    // estado de uma prop que mudou (sem o atraso de um useEffect).
    setAnterior(externo);
    setTexto(externo);
  }
  return [texto, setTexto] as const;
}

export function SeletorDataHora({
  rotulo,
  valor,
  aoMudar,
  aoLimpar,
  apenasData,
}: {
  rotulo: string;
  valor: Date | null;
  aoMudar: (d: Date) => void;
  aoLimpar?: () => void;
  apenasData?: boolean;
}) {
  const id = useId();
  const [texto, setTexto] = useTextoSincronizado(
    apenasData ? paraInputData(valor) : paraInputDataHora(valor),
  );

  return (
    <div className="mb-3.5">
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={apenasData ? 'date' : 'datetime-local'}
          value={texto}
          onChange={(e) => {
            const v = e.target.value;
            setTexto(v);
            const d = apenasData ? deInputData(v) : deInputDataHora(v);
            if (d) aoMudar(d);
            else if (v === '' && aoLimpar) aoLimpar();
          }}
          className={`${caixa} min-w-0 flex-1`}
        />
        {valor && aoLimpar ? (
          <button
            type="button"
            onClick={aoLimpar}
            aria-label={`Limpar ${rotulo}`}
            className="p-2 text-base text-texto-suave"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Hora do dia isolada ("HH:mm"), usada no plano de estadia da creche. */
export function SeletorHora({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string | null;
  aoMudar: (hhmm: string) => void;
}) {
  const id = useId();
  const [texto, setTexto] = useTextoSincronizado(valor ?? '');

  return (
    <div className="mb-3.5 flex-1">
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <input
        id={id}
        type="time"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          // O input entrega "HH:mm" — o mesmo formato que o plano guarda.
          if (/^\d{2}:\d{2}$/.test(e.target.value)) aoMudar(e.target.value);
        }}
        className={caixa}
      />
    </div>
  );
}

// ── Booleano ──────────────────────────────────────────────────────────────

export function LinhaSwitch({
  titulo,
  descricao,
  valor,
  aoMudar,
}: {
  titulo: string;
  descricao?: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    // O <label> envolve o botao: tocar no texto tambem alterna.
    <label className="flex cursor-pointer items-center gap-3 py-2">
      <span className="flex-1">
        <span className="block text-[15px] text-texto-escuro">{titulo}</span>
        {descricao ? (
          <span className="mt-0.5 block text-xs text-texto-suave">{descricao}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        // Explicito: o <label> em volta nem sempre vira o nome acessivel de
        // um <button> sem texto, e o leitor de tela anunciaria so "chave".
        aria-label={titulo}
        onClick={() => aoMudar(!valor)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          valor ? 'bg-primaria-clara' : 'bg-neutra'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6 rounded-full shadow transition-transform ${
            valor ? 'translate-x-5 bg-primaria' : 'bg-white'
          }`}
        />
      </button>
    </label>
  );
}

/**
 * Caixa de marcar com texto, para escolhas multiplas que sao itens de uma
 * lista (servicos), e nao liga/desliga de uma opcao (isso e o `LinhaSwitch`).
 *
 * `desabilitado` = a combinacao nao permite agora; `bloqueado` = nao muda
 * mais (mostra 🔒), mesmo comportamento do `Seletor`.
 */
export function LinhaCheckbox({
  titulo,
  valor,
  aoMudar,
  desabilitado,
  bloqueado,
}: {
  titulo: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
  desabilitado?: boolean;
  bloqueado?: boolean;
}) {
  const inativo = desabilitado || bloqueado;
  return (
    // So o desabilitado esmaece: um bloqueado marcado continua sendo parte
    // do agendamento, e precisa ler como tal.
    <label
      className={`flex items-center gap-3 py-2 ${
        inativo ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${desabilitado ? 'opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        checked={valor}
        disabled={inativo}
        onChange={(e) => aoMudar(e.target.checked)}
        className="size-5 shrink-0 accent-primaria"
      />
      <span className="flex-1 text-[15px] text-texto-escuro">{titulo}</span>
      {bloqueado ? <span className="text-sm">🔒</span> : null}
    </label>
  );
}

// ── Secao ─────────────────────────────────────────────────────────────────

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-3 text-[15px] font-bold text-primaria-escura">{titulo}</h2>
      {children}
    </section>
  );
}

/** Botoes em forma de pilula, para escolhas multiplas (caes, dias). */
export function Pilula({
  ativo,
  aoTocar,
  children,
}: {
  ativo: boolean;
  aoTocar: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoTocar}
      className={`rounded-full border px-3 py-2 text-sm transition-colors ${
        ativo
          ? 'border-primaria bg-primaria font-bold text-white'
          : 'border-neutra bg-white text-texto-escuro'
      }`}
    >
      {children}
    </button>
  );
}

/** Rodape fixo com a acao principal da tela (salvar). */
export function Rodape({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 border-t border-neutra/60 bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}
