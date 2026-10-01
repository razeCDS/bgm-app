/**
 * Texto de um erro para exibir ao usuario.
 *
 * O mobile usava `String(e)`, que prefixa "Error: " na mensagem. Os
 * repositorios ja lancam mensagens amigaveis (`ErroValidacao`, traducao dos
 * erros do Postgres) — basta mostrar a mensagem.
 */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
