/**
 * Espelha os agendamentos no Google Agenda.
 *
 * Disparada por triggers do Postgres: `enfileirar_sync_agenda` pede a
 * chamada HTTP ao `pg_net` quando um agendamento muda ou quando seus caes
 * sao gravados (o que toda RPC de escrita faz, inclusive ao mudar os
 * servicos). O app nao conhece esta funcao: as 12 ocorrencias de uma creche
 * recorrente nascem dentro do banco (via RPC), e os triggers as sincronizam
 * sozinhos.
 *
 * Regras (decididas com o cliente):
 *   - cada ocorrencia vira um evento proprio (nao usamos RRULE, porque cada
 *     uma pode ser cancelada isoladamente);
 *   - cancelar o agendamento APAGA o evento — o registro permanece no banco
 *     com status `cancelado`;
 *   - nenhum participante e convidado (service account nao envia convite
 *     sem domain-wide delegation, e a agenda e operacional);
 *   - falha de sync NUNCA invalida o agendamento: registramos o erro em
 *     `google_sync_erro` e devolvemos 200.
 *
 * ARQUIVO UNICO de proposito: o editor do painel do Supabase e single-file,
 * e imports relativos entre arquivos quebram no deploy se algum ficar para
 * tras. Para ~250 linhas, nao vale o risco.
 */

const FUSO = 'America/Sao_Paulo';
const CAL_API = 'https://www.googleapis.com/calendar/v3/calendars';
const ESCOPO_GOOGLE = 'https://www.googleapis.com/auth/calendar';
const TOKEN_URI_PADRAO = 'https://oauth2.googleapis.com/token';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Agendamento {
  id: string;
  data_hora_inicio: string;
  data_hora_fim: string | null;
  status: string;
  observacoes: string | null;
  google_calendar_event_id: string | null;
}

interface Payload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Agendamento | null;
  old_record: Agendamento | null;
}

interface DadosAnimal {
  nome: string;
  observacoes: string | null;
  tutores: { nome_completo: string; telefone: string | null } | null;
}

type Servico =
  | 'creche'
  | 'hotel'
  | 'banho'
  | 'tosa_higienica'
  | 'consulta'
  | 'visita';

// Mesma ordem e rotulos do app (`SERVICOS` / `rotuloServico`).
const rotuloServico: Record<Servico, string> = {
  creche: 'Creche',
  hotel: 'Hotel',
  banho: 'Banho',
  tosa_higienica: 'Tosa higiênica',
  consulta: 'Consulta',
  visita: 'Visita',
};
const ORDEM_SERVICOS = Object.keys(rotuloServico) as Servico[];

/** Linha de `agendamento_servicos`. `data` = dia especifico ("2026-08-20"). */
interface ServicoContratado {
  servico: Servico;
  data: string | null;
}

// ── Autenticacao Google (Service Account) ─────────────────────────────────
//
// Nao ha OAuth, tela de consentimento nem refresh token: a service account
// assina um JWT com a propria chave privada e troca por um access token.
// Por isso nada expira "de vez" nem exige alguem refazer login.
// Usa apenas a Web Crypto API do Deno — sem biblioteca externa.

/** base64url (o JWT nao aceita `+`, `/` nem `=`). */
function base64url(dados: ArrayBuffer | string): string {
  const bytes =
    typeof dados === 'string'
      ? new TextEncoder().encode(dados)
      : new Uint8Array(dados);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Converte a chave PEM (PKCS#8) do JSON da service account em CryptoKey. */
async function importarChave(pem: string): Promise<CryptoKey> {
  const corpo = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    // O JSON guarda as quebras como \n literais.
    .replace(/\\n/g, '')
    .replace(/\s/g, '');

  const bin = atob(corpo);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);

  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function obterAccessToken(contaServicoJson: string): Promise<string> {
  let conta: { client_email: string; private_key: string; token_uri?: string };
  try {
    conta = JSON.parse(contaServicoJson);
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT nao e um JSON valido. Cole o conteudo ' +
        'integral do arquivo baixado do Google Cloud.',
    );
  }

  if (!conta.client_email || !conta.private_key) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT sem `client_email` ou `private_key`.',
    );
  }

  const agora = Math.floor(Date.now() / 1000);
  const tokenUri = conta.token_uri ?? TOKEN_URI_PADRAO;

  const cabecalho = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({
      iss: conta.client_email,
      scope: ESCOPO_GOOGLE,
      aud: tokenUri,
      iat: agora,
      exp: agora + 3600,
    }),
  );

  const chave = await importarChave(conta.private_key);
  const assinatura = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    chave,
    new TextEncoder().encode(`${cabecalho}.${corpo}`),
  );

  const jwt = `${cabecalho}.${corpo}.${base64url(assinatura)}`;

  const resposta = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const dados = await resposta.json();
  if (!resposta.ok || !dados.access_token) {
    throw new Error(
      `Falha ao obter token do Google (${resposta.status}): ` +
        `${dados.error_description ?? dados.error ?? 'sem detalhe'}`,
    );
  }

  return dados.access_token as string;
}

// ── Acesso ao proprio banco ───────────────────────────────────────────────

async function pg(caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${await r.text()}`);
  return r;
}

/** Animais do agendamento, via juncao `agendamento_animais`. */
async function buscarAnimais(agendamentoId: string): Promise<DadosAnimal[]> {
  const r = await pg(
    `agendamento_animais?agendamento_id=eq.${agendamentoId}` +
      `&select=animais(nome,observacoes,tutores(nome_completo,telefone))`,
  );
  const linhas = (await r.json()) as { animais: DadosAnimal | null }[];
  return linhas
    .map((l) => l.animais)
    .filter((a): a is DadosAnimal => a !== null);
}

/**
 * Servicos do agendamento, na ordem de exibicao do app: por servico, e
 * dentro dele o "sem dia" primeiro e depois os dias.
 *
 * Lidos do banco, e nao do payload: o payload e a linha de `agendamentos`,
 * e os servicos moram em outra tabela.
 */
async function buscarServicos(agendamentoId: string): Promise<ServicoContratado[]> {
  const r = await pg(
    `agendamento_servicos?agendamento_id=eq.${agendamentoId}&select=servico,data`,
  );
  const linhas = (await r.json()) as ServicoContratado[];
  return linhas.sort(
    (a, b) =>
      ORDEM_SERVICOS.indexOf(a.servico) - ORDEM_SERVICOS.indexOf(b.servico) ||
      // "2026-08-20" ordena como texto; sem dia ('') vem antes.
      (a.data ?? '').localeCompare(b.data ?? ''),
  );
}

/** "2026-08-20" -> "20/08". Corte de texto: sem `Date`, sem fuso. */
const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Le o id do evento DIRETO do banco, ignorando o payload.
 *
 * O `pg_net` e assincrono: varias chamadas podem sair com o mesmo retrato do
 * agendamento e todas acharem que nao ha evento ainda — foi o que gerou
 * eventos duplicados no Google. Lendo aqui, quem chega depois faz PATCH em
 * vez de criar outro.
 */
async function eventoAtual(agendamentoId: string): Promise<string | null> {
  const r = await pg(
    `agendamentos?id=eq.${agendamentoId}&select=google_calendar_event_id`,
  );
  const linhas = (await r.json()) as { google_calendar_event_id: string | null }[];
  return linhas[0]?.google_calendar_event_id ?? null;
}

async function registrarSync(
  id: string,
  campos: Record<string, unknown>,
): Promise<void> {
  // Estas colunas ficam FORA do trigger de proposito: gravar aqui nao pode
  // redisparar o webhook (seria laco infinito).
  await pg(`agendamentos?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(campos),
  });
}

// ── Montagem do evento ────────────────────────────────────────────────────

function montarEvento(
  a: Agendamento,
  animais: DadosAnimal[],
  servicos: ServicoContratado[],
) {
  const nomes = animais.map((x) => x.nome).join(', ') || 'Animal';
  // Titulo sem repetir: um Banho em dois dias da hospedagem aparece uma vez.
  const titulo =
    [...new Set(servicos.map((s) => s.servico))]
      .map((s) => rotuloServico[s] ?? s)
      .join(' + ') || 'Agendamento';
  // Com mais de um servico, a descricao lista cada um — e e ali que o dia de
  // um extra do Hotel aparece ("Banho — 20/08"), ja que o evento cobre a
  // estadia inteira.
  const listaServicos =
    servicos.length > 1
      ? servicos
          .map((s) => {
            const dia = s.data ? ` — ${diaCurto(s.data)}` : '';
            return `- ${rotuloServico[s.servico] ?? s.servico}${dia}`;
          })
          .join('\n')
      : null;
  // O tutor e o mesmo para todos os caes do agendamento.
  const tutor = animais[0]?.tutores ?? null;

  const sobreCaes = animais
    .filter((x) => x.observacoes)
    .map((x) => `${x.nome}: ${x.observacoes}`)
    .join('\n');

  const descricao = [
    tutor ? `Tutor: ${tutor.nome_completo}` : null,
    tutor?.telefone ? `Telefone: ${tutor.telefone}` : null,
    listaServicos ? `\nServiços:\n${listaServicos}` : null,
    animais.length > 1 ? `\nCães (${animais.length}): ${nomes}` : null,
    sobreCaes ? `\nSobre:\n${sobreCaes}` : null,
    a.observacoes ? `\nObservações: ${a.observacoes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const inicio = a.data_hora_inicio;
  // O Google exige `end`. Sem data final, assume uma hora.
  const fim =
    a.data_hora_fim ??
    new Date(new Date(inicio).getTime() + 60 * 60 * 1000).toISOString();

  return {
    summary: `${nomes} — ${titulo}`,
    description: descricao || undefined,
    start: { dateTime: inicio, timeZone: FUSO },
    end: { dateTime: fim, timeZone: FUSO },
    // Sem `attendees`: a agenda e operacional, e service account nao
    // consegue enviar convites sem domain-wide delegation.
  };
}

// ── Google Calendar ───────────────────────────────────────────────────────

function chamarCalendar(
  token: string,
  calendarId: string,
  caminho: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(
    `${CAL_API}/${encodeURIComponent(calendarId)}/events${caminho}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    },
  );
}

// ── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  let agendamento: Agendamento | null = null;

  try {
    const payload = (await req.json()) as Payload;
    agendamento = payload.record ?? payload.old_record;

    if (!agendamento) {
      return Response.json({ ignorado: 'sem registro no payload' });
    }

    const contaServico = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    // `trim`: um Enter sobrando ao colar o secret vira `%0A` na URL, e o
    // Google responde 404 como se o calendario nao existisse. Custou uma
    // sessao inteira de investigacao.
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID')?.trim();
    if (!contaServico || !calendarId) {
      throw new Error(
        'Secrets ausentes: defina GOOGLE_SERVICE_ACCOUNT e GOOGLE_CALENDAR_ID.',
      );
    }

    const token = await obterAccessToken(contaServico);
    const eventoId = await eventoAtual(agendamento.id);

    // ── Cancelado: apaga do Google ──
    if (agendamento.status === 'cancelado') {
      if (eventoId) {
        const r = await chamarCalendar(token, calendarId, `/${eventoId}`, {
          method: 'DELETE',
        });
        // 404/410 = ja removido; tratamos como sucesso.
        if (!r.ok && r.status !== 404 && r.status !== 410) {
          throw new Error(`Falha ao apagar evento (${r.status})`);
        }
        await registrarSync(agendamento.id, {
          google_calendar_event_id: null,
          google_sync_em: new Date().toISOString(),
          google_sync_erro: null,
        });
      }
      return Response.json({ acao: 'apagado' });
    }

    // ── Ativo: cria ou atualiza ──
    const animais = await buscarAnimais(agendamento.id);

    // Sem caes vinculados ainda: nada util a espelhar. O trigger da juncao
    // dispara assim que os vinculos entram.
    if (animais.length === 0) {
      return Response.json({ ignorado: 'sem animais vinculados ainda' });
    }

    const servicos = await buscarServicos(agendamento.id);
    const corpo = JSON.stringify(montarEvento(agendamento, animais, servicos));

    // Se ja existe evento, faz PATCH — assim um webhook repetido nao
    // duplica o compromisso na agenda.
    let resposta = eventoId
      ? await chamarCalendar(token, calendarId, `/${eventoId}`, {
          method: 'PATCH',
          body: corpo,
        })
      : await chamarCalendar(token, calendarId, '', {
          method: 'POST',
          body: corpo,
        });

    // O evento pode ter sido apagado direto no Google: recria.
    if (eventoId && (resposta.status === 404 || resposta.status === 410)) {
      resposta = await chamarCalendar(token, calendarId, '', {
        method: 'POST',
        body: corpo,
      });
    }

    if (!resposta.ok) {
      throw new Error(
        `Google Calendar respondeu ${resposta.status}: ${await resposta.text()}`,
      );
    }

    const evento = await resposta.json();
    await registrarSync(agendamento.id, {
      google_calendar_event_id: evento.id,
      google_sync_em: new Date().toISOString(),
      google_sync_erro: null,
    });

    return Response.json({
      acao: eventoId ? 'atualizado' : 'criado',
      id: evento.id,
      caes: animais.length,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error('sincronizar-agenda:', mensagem);

    // O agendamento e a fonte da verdade — registramos a falha e seguimos.
    // Devolver erro aqui so encheria a fila de retry sem resolver nada.
    if (agendamento?.id) {
      try {
        await registrarSync(agendamento.id, {
          google_sync_erro: mensagem.slice(0, 500),
        });
      } catch {
        // Se nem isso funcionar, resta o log.
      }
    }
    return Response.json({ erro: mensagem }, { status: 200 });
  }
});
