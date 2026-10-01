/** Indicador de atividade — o `ActivityIndicator` do mobile. */
export function Spinner({ claro }: { claro?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={`inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent ${
        claro ? 'text-white' : 'text-primaria'
      }`}
    />
  );
}
