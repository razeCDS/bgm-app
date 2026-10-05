/**
 * Primeira tela depois do login — e destino de `/`, ja que nao ha mais tela
 * de modulos (so existe o de Estadias).
 *
 * Arquivo proprio, sem `'use client'` nem hooks, porque o proxy tambem o
 * importa, e ele roda no servidor antes de qualquer pagina, fora do React.
 */
export const ROTA_INICIAL = '/estadias/agendamentos';
