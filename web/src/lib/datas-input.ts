import { format, isValid, parse } from 'date-fns';

/**
 * Conversao entre `Date` e o texto dos inputs nativos de data/hora.
 *
 * Os inputs `date`, `datetime-local` e `time` trabalham com texto
 * ("2026-10-01", "2026-10-01T08:30", "08:30") no fuso LOCAL. A armadilha
 * classica e `new Date("2026-10-01")`: o JS le data sem hora como UTC, e no
 * Brasil (UTC-3) isso vira 30/09 as 21h — o dia escolhido "volta" um dia.
 * Por isso a leitura passa sempre pelo `parse` do date-fns, que usa o fuso
 * local.
 */

const FMT_DATA = 'yyyy-MM-dd';
const FMT_DATA_HORA = "yyyy-MM-dd'T'HH:mm";

export const paraInputData = (d: Date | null) =>
  d ? format(d, FMT_DATA) : '';

export const paraInputDataHora = (d: Date | null) =>
  d ? format(d, FMT_DATA_HORA) : '';

/** Meia-noite local do dia informado, ou `null` se vazio/invalido. */
export function deInputData(v: string): Date | null {
  if (!v) return null;
  const d = parse(v, FMT_DATA, new Date());
  return isValid(d) ? d : null;
}

export function deInputDataHora(v: string): Date | null {
  if (!v) return null;
  const d = parse(v, FMT_DATA_HORA, new Date());
  return isValid(d) ? d : null;
}
