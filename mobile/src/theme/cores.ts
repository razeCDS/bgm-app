/**
 * Paleta oficial do BGM Daycare.
 *
 * Estes sao os unicos literais de cor do app: qualquer tela deve consumir
 * daqui, nunca declarar `#rrggbb` inline.
 */
export const cores = {
  /** Verde escuro — cor primaria (cabecalho, botoes, destaques). */
  primaria: '#46715C',
  /** Rosa terracota — cor de acento (badges, icones, chips). */
  acento: '#DCA899',
  /** Verde-acinzentado — bordas e superficies secundarias. */
  neutra: '#ADB4AB',
  /** Branco — fundo principal e texto sobre cor escura. */
  branco: '#FFFFFF',

  // Variacoes derivadas
  primariaEscura: '#35543F',
  primariaClara: '#6B9280',
  neutraClara: '#EDEFEC',
  textoEscuro: '#1F2B24',
  textoSuave: '#5F6B63',
  erro: '#B3261E',

  /** Sobreposicoes translucidas (RN nao tem helper de opacidade). */
  brancoSuave: 'rgba(255,255,255,0.80)',
  brancoTenue: 'rgba(255,255,255,0.60)',
  primariaTenue: 'rgba(70,113,92,0.12)',
  neutraTenue: 'rgba(173,180,171,0.35)',
  acentoTenue: 'rgba(220,168,153,0.35)',
  erroTenue: 'rgba(179,38,30,0.10)',
} as const;

export type Cor = keyof typeof cores;
