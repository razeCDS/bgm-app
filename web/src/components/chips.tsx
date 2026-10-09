import {
  rotuloServico,
  rotuloStatus,
  type ServicoAgendamento,
  type StatusAgendamento,
} from '../features/estadias/types/enums';

/*
 * Classes completas, e nao montadas por interpolacao (`bg-${cor}`): o
 * Tailwind gera o CSS lendo o codigo-fonte, e uma classe que so existe em
 * tempo de execucao nunca chega a existir no CSS.
 */
const paletaStatus: Record<StatusAgendamento, string> = {
  solicitado: 'bg-neutra-clara text-texto-suave',
  confirmado: 'bg-primaria/12 text-primaria-escura',
  em_andamento: 'bg-acento text-primaria-escura',
  concluido: 'bg-neutra/35 text-texto-escuro',
  cancelado: 'bg-erro/10 text-erro',
};

export function ChipStatus({ status }: { status: StatusAgendamento }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${paletaStatus[status]}`}
    >
      {rotuloStatus[status]}
    </span>
  );
}

export const iconeServico: Record<ServicoAgendamento, string> = {
  creche: '☀️',
  hotel: '🏨',
  banho: '🚿',
  tosa_higienica: '✂️',
  consulta: '🩺',
  visita: '🤝',
};

/** Os servicos de um agendamento, lado a lado. */
export function ChipsServicos({ servicos }: { servicos: ServicoAgendamento[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {servicos.map((s) => (
        <span
          key={s}
          className="flex items-center gap-1 text-xs font-medium text-texto-suave"
        >
          <span className="text-[13px]">{iconeServico[s]}</span>
          {rotuloServico[s]}
        </span>
      ))}
    </span>
  );
}
