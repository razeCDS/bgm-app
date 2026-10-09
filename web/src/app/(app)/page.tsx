import { redirect } from 'next/navigation';

import { ROTA_INICIAL } from '@/lib/rotas';

/**
 * `/` nao tem tela propria: a tela de modulos saiu, e o app abre direto nos
 * agendamentos. A rota continua existindo porque o PWA instalado abre em `/`
 * (`start_url` do manifesto) e o "voltar" sem historico cai aqui.
 */
export default function PaginaInicio() {
  redirect(ROTA_INICIAL);
}
