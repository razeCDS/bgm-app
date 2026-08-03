import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Formatadores pt-BR usados em todo o app. */

const opts = { locale: ptBR } as const;

export const formatarData = (d: Date) => format(d, 'dd/MM/yyyy', opts);
export const formatarDataHora = (d: Date) => format(d, 'dd/MM/yyyy HH:mm', opts);
export const formatarHora = (d: Date) => format(d, 'HH:mm', opts);

export const formatarDataOuNulo = (d: Date | null | undefined) =>
  d ? formatarData(d) : null;

export const formatarMoeda = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(v);

/**
 * Intervalo compacto de um agendamento.
 * A data final e opcional no banco, entao o fim pode nao existir.
 */
export function formatarIntervalo(inicio: Date, fim: Date | null): string {
  if (!fim) return formatarDataHora(inicio);
  const mesmoDia =
    inicio.getFullYear() === fim.getFullYear() &&
    inicio.getMonth() === fim.getMonth() &&
    inicio.getDate() === fim.getDate();
  return mesmoDia
    ? `${formatarDataHora(inicio)} — ${formatarHora(fim)}`
    : `${formatarDataHora(inicio)} — ${formatarDataHora(fim)}`;
}

/** "HH:mm" a partir de um `time` do Postgres ("08:00:00"). */
export const horaCurta = (t: string | null | undefined) =>
  t ? t.slice(0, 5) : null;
