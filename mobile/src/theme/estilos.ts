import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { cores } from './cores';

/** Espacamentos, raios e tipografia — equivalente ao ThemeData do Flutter. */
export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const raio = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 20,
} as const;

export const tipografia = {
  titulo: { fontSize: 20, fontWeight: '600' } as TextStyle,
  secao: { fontSize: 15, fontWeight: '700', color: cores.primariaEscura } as TextStyle,
  corpo: { fontSize: 14, color: cores.textoEscuro } as TextStyle,
  suave: { fontSize: 13, color: cores.textoSuave } as TextStyle,
  mini: { fontSize: 12, color: cores.textoSuave } as TextStyle,
} as const;

/** Caixa visual compartilhada entre `TextInput` e campos "de toque". */
const caixaCampo: ViewStyle = {
  backgroundColor: cores.neutraClara,
  borderRadius: raio.md,
  paddingHorizontal: espaco.md + 2,
  paddingVertical: espaco.md + 2,
};

/** Estilos reutilizados por varias telas. */
export const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.branco,
  } as ViewStyle,

  cartao: {
    backgroundColor: cores.branco,
    borderRadius: raio.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.neutra,
    padding: espaco.lg,
  } as ViewStyle,

  /**
   * Caixa do campo, sem propriedades de texto.
   * Use em containers (`View`, `Pressable`), que aceitam apenas `ViewStyle`.
   */
  campoCaixa: caixaCampo,

  /** Caixa + texto, para `TextInput`. */
  campo: {
    ...caixaCampo,
    fontSize: 15,
    color: cores.textoEscuro,
  } as TextStyle,

  rotuloCampo: {
    fontSize: 12,
    color: cores.textoSuave,
    marginBottom: espaco.xs + 2,
  } as TextStyle,

  botaoPrimario: {
    backgroundColor: cores.primaria,
    borderRadius: raio.md,
    paddingVertical: espaco.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  } as ViewStyle,

  botaoPrimarioTexto: {
    color: cores.branco,
    fontSize: 15,
    fontWeight: '600',
  } as TextStyle,

  botaoSecundario: {
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.primaria,
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: espaco.sm,
  } as ViewStyle,

  botaoSecundarioTexto: {
    color: cores.primaria,
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,

  desabilitado: {
    opacity: 0.5,
  } as ViewStyle,
});
