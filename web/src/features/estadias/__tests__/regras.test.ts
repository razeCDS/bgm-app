import { describe, expect, it } from 'vitest';
import { RepositorioFake } from '../data/repositorio-fake';
import {
  comHorario,
  diasDaEstadia,
  erroMudancaServicos,
  fimDaJanela,
  gerarOcorrencias,
  validarAgendamento,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import {
  diaSemanaDe,
  erroCombinacao,
  servicoIncompativel,
  type DiaSemana,
  type ServicoAgendamento,
} from '../types/enums';
import {
  FILTRO_VAZIO,
  ordenarServicos,
  servicosDe,
  valorEPorDia,
  valorTotalDe,
} from '../types/modelos';

/** Servicos sem valor informado. */
const so = (...lista: ServicoAgendamento[]) =>
  lista.map((servico) => ({ servico, valor: null, data: null }));

const base = (over: Partial<EntradaAgendamento> = {}): EntradaAgendamento => ({
  animalIds: ['x'],
  servicos: so('visita'),
  dataHoraInicio: new Date(2026, 7, 10),
  dataHoraFim: null,
  status: 'solicitado',
  recorrente: false,
  diasSemanaRecorrencia: [],
  observacoes: null,
  planoEstadia: null,
  pertencesDeixados: null,
  ...over,
});

const planoVazio = {
  tipoPlano: null,
  totalDias: null,
  horarioEntrada: null,
  horarioSaida: null,
  formaPagamento: null,
};

/**
 * Plano minimo valido para Creche: entrada e saida sao obrigatorias, porque
 * sao a unica fonte da hora de cada ocorrencia.
 */
const planoCreche = {
  ...planoVazio,
  horarioEntrada: '08:00',
  horarioSaida: '18:00',
};

const pertences = {
  temCaminha: true,
  corCaminha: null,
  temRoupa: false,
  corRoupa: null,
  temBrinquedo: false,
  qualBrinquedo: null,
  racao: null,
  quantidade: null,
  vezes: null,
  observacoes: null,
};

describe('Regras de negocio', () => {
  it('Visita nao aceita plano de estadia nem pertences', () => {
    expect(
      validarAgendamento(base({ servicos: so('visita'), planoEstadia: planoCreche })),
    ).toContain('Creche');
    expect(
      validarAgendamento(base({ servicos: so('visita'), pertencesDeixados: pertences })),
    ).toContain('Creche ou Hotel');
  });

  it('Visita nao aceita valor', () => {
    const erro = validarAgendamento(
      base({ servicos: [{ servico: 'visita', valor: 50, data: null }] }),
    );
    expect(erro).toContain('Visita');
  });

  it('Hotel nao exige plano de estadia', () => {
    // O Hotel usa o proprio periodo como entrada/saida; o plano (rotina
    // diaria) nao se aplica.
    expect(validarAgendamento(base({ servicos: so('hotel') }))).toBeNull();
  });

  it('Hotel nao aceita plano de estadia', () => {
    // Antes o plano guardava o valor do Hotel; agora o valor mora no
    // servico, e o plano e exclusivo da Creche.
    const erro = validarAgendamento(
      base({ servicos: so('hotel'), planoEstadia: planoCreche }),
    );
    expect(erro).toContain('Creche');
  });

  it('Hotel aceita valor e pertences', () => {
    const erro = validarAgendamento(
      base({
        servicos: [{ servico: 'hotel', valor: 480, data: null }],
        dataHoraFim: new Date(2026, 7, 14),
        pertencesDeixados: pertences,
      }),
    );
    expect(erro).toBeNull();
  });

  it('Creche exige plano de estadia', () => {
    const erro = validarAgendamento(base({ servicos: so('creche') }));
    expect(erro).toContain('obrigatorio');
  });

  it('Creche exige horario de entrada e de saida', () => {
    // Sem a secao de Periodo, estes horarios sao a unica fonte da hora de
    // cada ocorrencia — nulos, tudo cairia a meia-noite silenciosamente.
    const semNada = validarAgendamento(
      base({ servicos: so('creche'), planoEstadia: planoVazio }),
    );
    expect(semNada).toContain('entrada');

    const semSaida = validarAgendamento(
      base({
        servicos: so('creche'),
        planoEstadia: { ...planoVazio, horarioEntrada: '08:00' },
      }),
    );
    expect(semSaida).toContain('saida');

    expect(
      validarAgendamento(base({ servicos: so('creche'), planoEstadia: planoCreche })),
    ).toBeNull();
  });

  it('Creche com extras continua exigindo o plano', () => {
    // O plano vem da Creche, nao importa o que esteja junto.
    const erro = validarAgendamento(base({ servicos: so('creche', 'banho') }));
    expect(erro).toContain('obrigatorio');
  });

  it('extras sozinhos nao exigem plano nem horarios', () => {
    for (const extra of ['banho', 'tosa_higienica', 'consulta'] as const) {
      expect(validarAgendamento(base({ servicos: so(extra) }))).toBeNull();
    }
    expect(
      validarAgendamento(
        base({
          servicos: [
            { servico: 'banho', valor: 60, data: null },
            { servico: 'tosa_higienica', valor: 40, data: null },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('extras sozinhos nao aceitam pertences', () => {
    const erro = validarAgendamento(
      base({ servicos: so('banho'), pertencesDeixados: pertences }),
    );
    expect(erro).toContain('Creche ou Hotel');
  });

  it('valor negativo e rejeitado', () => {
    const erro = validarAgendamento(
      base({ servicos: [{ servico: 'banho', valor: -1, data: null }] }),
    );
    expect(erro).toContain('negativo');
  });

  it('Banho nao aceita recorrencia', () => {
    const erro = validarAgendamento(
      base({
        servicos: so('banho'),
        dataHoraFim: new Date(2026, 7, 28),
        recorrente: true,
        diasSemanaRecorrencia: [1],
      }),
    );
    expect(erro).toContain('Creche');
  });

  it('recorrencia so vale com Creche', () => {
    const erro = validarAgendamento(
      base({
        servicos: so('hotel'),
        dataHoraFim: new Date(2026, 7, 28),
        recorrente: true,
        diasSemanaRecorrencia: [1],
      }),
    );
    expect(erro).toContain('Creche');
  });

  it('Creche com Banho aceita recorrencia', () => {
    const erro = validarAgendamento(
      base({
        servicos: so('creche', 'banho'),
        dataHoraFim: new Date(2026, 7, 28),
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: planoCreche,
      }),
    );
    expect(erro).toBeNull();
  });

  it('data final anterior a inicial e rejeitada', () => {
    const erro = validarAgendamento(
      base({ dataHoraInicio: new Date(2026, 7, 10), dataHoraFim: new Date(2026, 7, 9) }),
    );
    expect(erro).not.toBeNull();
  });
});

describe('Combinacao de servicos', () => {
  it('exige ao menos um servico', () => {
    expect(erroCombinacao([])).not.toBeNull();
    expect(validarAgendamento(base({ servicos: [] }))).toContain('serviço');
  });

  it('Creche e Hotel se excluem', () => {
    expect(erroCombinacao(['creche', 'hotel'])).toContain('Creche e Hotel');
  });

  it('Visita fica sozinha', () => {
    expect(erroCombinacao(['visita'])).toBeNull();
    expect(erroCombinacao(['banho', 'visita'])).toContain('Visita');
    expect(erroCombinacao(['hotel', 'visita'])).toContain('Visita');
  });

  it('extras combinam com Creche, com Hotel ou entre si', () => {
    expect(erroCombinacao(['creche', 'banho', 'tosa_higienica', 'consulta'])).toBeNull();
    expect(erroCombinacao(['hotel', 'banho'])).toBeNull();
    expect(erroCombinacao(['banho', 'consulta'])).toBeNull();
  });

  it('servico repetido sem dia e rejeitado', () => {
    // A combinacao olha servicos distintos; a repeticao e checada pelo par
    // servico + dia.
    expect(erroCombinacao(['banho', 'banho'])).toBeNull();
    expect(validarAgendamento(base({ servicos: so('banho', 'banho') }))).toContain(
      'repetido',
    );
  });

  it('o formulario desabilita so o que formaria combinacao invalida', () => {
    // Com Creche marcada: Hotel e Visita apagam; extras seguem livres.
    expect(servicoIncompativel('hotel', ['creche'])).toBe(true);
    expect(servicoIncompativel('visita', ['creche'])).toBe(true);
    expect(servicoIncompativel('banho', ['creche'])).toBe(false);
    // Um servico ja marcado nunca fica desabilitado: precisa poder desmarcar.
    expect(servicoIncompativel('creche', ['creche'])).toBe(false);
    // Nada marcado: tudo livre.
    expect(servicoIncompativel('visita', [])).toBe(false);
  });
});

describe('Extras num dia da hospedagem', () => {
  // Hotel de 18/08 09h a 22/08 18h.
  const hotel = (extras: { servico: ServicoAgendamento; data: Date | null }[]) =>
    base({
      servicos: [
        { servico: 'hotel', valor: 480, data: null },
        ...extras.map((x) => ({ ...x, valor: null })),
      ],
      dataHoraInicio: new Date(2026, 7, 18, 9),
      dataHoraFim: new Date(2026, 7, 22, 18),
    });

  it('os dias da estadia vao da entrada a saida, inclusive', () => {
    const dias = diasDaEstadia(new Date(2026, 7, 18, 9), new Date(2026, 7, 22, 18));
    expect(dias.map((d) => d.getDate())).toEqual([18, 19, 20, 21, 22]);
    // Meia-noite local: e o que se compara com a data do extra.
    expect(dias[0].getHours()).toBe(0);
    // Sem data final, so o dia de entrada (a mesma regra do banco).
    expect(diasDaEstadia(new Date(2026, 7, 18, 9), null)).toHaveLength(1);
  });

  it('aceita extra num dia dentro da estadia, inclusive entrada e saida', () => {
    expect(
      validarAgendamento(
        hotel([
          { servico: 'banho', data: new Date(2026, 7, 18) },
          { servico: 'banho', data: new Date(2026, 7, 22) },
          { servico: 'tosa_higienica', data: new Date(2026, 7, 20) },
        ]),
      ),
    ).toBeNull();
  });

  it('o mesmo extra pode vir sem dia e em dias diferentes', () => {
    expect(
      validarAgendamento(
        hotel([
          { servico: 'banho', data: null },
          { servico: 'banho', data: new Date(2026, 7, 19) },
          { servico: 'banho', data: new Date(2026, 7, 21) },
        ]),
      ),
    ).toBeNull();
  });

  it('recusa o mesmo extra duas vezes no mesmo dia', () => {
    const erro = validarAgendamento(
      hotel([
        { servico: 'banho', data: new Date(2026, 7, 20) },
        { servico: 'banho', data: new Date(2026, 7, 20) },
      ]),
    );
    expect(erro).toContain('repetido no dia 20/08/2026');
  });

  it('recusa dia fora da estadia', () => {
    const erro = validarAgendamento(
      hotel([{ servico: 'banho', data: new Date(2026, 7, 23) }]),
    );
    expect(erro).toContain('fora do período');
  });

  it('dia especifico so existe para extras de Hotel', () => {
    // O proprio Hotel nao tem dia: ele e a estadia.
    expect(
      validarAgendamento(
        base({
          servicos: [{ servico: 'hotel', valor: null, data: new Date(2026, 7, 18) }],
          dataHoraInicio: new Date(2026, 7, 18, 9),
          dataHoraFim: new Date(2026, 7, 22, 18),
        }),
      ),
    ).toContain('Hotel');
    // Na Creche cada dia ja e uma ocorrencia: o extra vai sem dia.
    expect(
      validarAgendamento(
        base({
          servicos: [
            { servico: 'creche', valor: null, data: null },
            { servico: 'banho', valor: null, data: new Date(2026, 7, 10) },
          ],
          planoEstadia: planoCreche,
        }),
      ),
    ).toContain('Hotel');
    // Banho sozinho tambem nao.
    expect(
      validarAgendamento(
        base({ servicos: [{ servico: 'banho', valor: null, data: new Date(2026, 7, 10) }] }),
      ),
    ).toContain('Hotel');
  });

  it('o banho em dois dias conta como um servico so nos chips e nas regras', () => {
    const servicos = [
      { servico: 'hotel' as const, valor: 480, data: null },
      { servico: 'banho' as const, valor: 70, data: new Date(2026, 7, 19) },
      { servico: 'banho' as const, valor: 70, data: new Date(2026, 7, 21) },
    ];
    expect(servicosDe(servicos)).toEqual(['hotel', 'banho']);
    expect(valorTotalDe(servicos)).toBe(620);
  });

  it('ordena por servico e, dentro dele, sem dia primeiro', () => {
    const ordenados = ordenarServicos([
      { servico: 'banho' as const, data: new Date(2026, 7, 21) },
      { servico: 'hotel' as const, data: null },
      { servico: 'banho' as const, data: null },
      { servico: 'banho' as const, data: new Date(2026, 7, 19) },
    ]);
    expect(ordenados.map((s) => `${s.servico} ${s.data?.getDate() ?? '-'}`)).toEqual([
      'hotel -',
      'banho -',
      'banho 19',
      'banho 21',
    ]);
  });
});

describe('Edicao de servicos', () => {
  it('extras entram e saem livremente', () => {
    expect(erroMudancaServicos(['creche'], ['creche', 'banho'])).toBeNull();
    expect(erroMudancaServicos(['hotel', 'banho'], ['hotel'])).toBeNull();
    expect(erroMudancaServicos(['banho'], ['tosa_higienica'])).toBeNull();
  });

  it('principais nao podem ser trocados, incluidos ou removidos', () => {
    expect(erroMudancaServicos(['creche'], ['hotel'])).not.toBeNull();
    expect(erroMudancaServicos(['banho'], ['creche', 'banho'])).not.toBeNull();
    expect(erroMudancaServicos(['hotel', 'banho'], ['banho'])).not.toBeNull();
    expect(erroMudancaServicos(['visita'], ['banho'])).not.toBeNull();
  });

  it('o repositorio recusa a troca do principal', async () => {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const animal = await repo.salvarAnimal({
      id: '',
      tutorId: tutor.id,
      nome: 'Rex',
      raca: null,
      idade: null,
      porte: null,
      peso: null,
      especie: null,
      sexo: null,
      castrado: null,
      docil: null,
      observacoes: null,
    });
    const dados = {
      animalIds: [animal.id],
      dataHoraInicio: new Date(2026, 8, 10, 9),
      dataHoraFim: new Date(2026, 8, 14, 18),
      status: 'confirmado' as const,
    };
    const [criado] = await repo.criarAgendamento(base({ ...dados, servicos: so('hotel') }));

    // Incluir um banho: ok.
    const comBanho = await repo.atualizarAgendamento(
      criado.id,
      base({ ...dados, servicos: [...so('hotel'), { servico: 'banho', valor: 70, data: null }] }),
    );
    expect(comBanho.servicos.map((s) => s.servico)).toEqual(['hotel', 'banho']);

    // Trocar Hotel por Banho: recusado.
    await expect(
      repo.atualizarAgendamento(criado.id, base({ ...dados, servicos: so('banho') })),
    ).rejects.toThrow(/Cancele/);
  });
});

describe('Valores por servico', () => {
  it('soma so os valores informados', () => {
    expect(
      valorTotalDe([
        { servico: 'creche', valor: 80, data: null },
        { servico: 'banho', valor: 50, data: null },
        { servico: 'consulta', valor: null, data: null },
      ]),
    ).toBe(130);
  });

  it('sem nenhum valor informado, o total e nulo (e nao zero)', () => {
    expect(valorTotalDe(so('banho', 'tosa_higienica'))).toBeNull();
  });

  it('com Creche o valor e por dia', () => {
    expect(valorEPorDia(so('creche', 'banho'))).toBe(true);
    expect(valorEPorDia(so('hotel', 'banho'))).toBe(false);
  });
});

describe('Recorrencia', () => {
  it('dia da semana segue a convencao do Postgres (0 = domingo)', () => {
    // 2026-08-02 e um domingo.
    expect(diaSemanaDe(new Date(2026, 7, 2))).toBe(0);
    expect(diaSemanaDe(new Date(2026, 7, 3))).toBe(1);
    expect(diaSemanaDe(new Date(2026, 7, 8))).toBe(6);
  });

  it('gera uma ocorrencia por dia marcado no periodo', () => {
    const entrada = base({
      servicos: so('creche'),
      dataHoraInicio: new Date(2026, 7, 3, 8),
      dataHoraFim: new Date(2026, 7, 28, 18),
      status: 'confirmado',
      recorrente: true,
      diasSemanaRecorrencia: [1, 3, 5] as DiaSemana[],
      planoEstadia: planoCreche,
    });

    const ocorrencias = gerarOcorrencias(entrada);

    // Agosto/2026: seg/qua/sex entre 03 e 28 => 12 dias.
    expect(ocorrencias).toHaveLength(12);
    for (const { inicio } of ocorrencias) {
      expect([1, 3, 5]).toContain(diaSemanaDe(inicio));
    }
  });

  it('criarAgendamento persiste as ocorrencias com a mesma serie', async () => {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor Teste',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const animal = await repo.salvarAnimal({
      id: '',
      tutorId: tutor.id,
      nome: 'Animal Teste',
      raca: null,
      idade: null,
      porte: null,
      peso: null,
      especie: null,
      sexo: null,
      castrado: null,
      docil: null,
      observacoes: null,
    });

    const criados = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('creche'),
        dataHoraInicio: new Date(2026, 7, 3, 8),
        dataHoraFim: new Date(2026, 7, 14, 18),
        status: 'confirmado',
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: planoCreche,
      }),
    );

    // Segundas entre 03 e 14/08/2026: dias 03 e 10.
    expect(criados).toHaveLength(2);
    const series = new Set(criados.map((a) => a.agendamentoRecorrenciaId));
    expect(series.size).toBe(1);
    expect([...series][0]).toBeTruthy();

    // Cancelar uma ocorrencia nao afeta a outra.
    await repo.cancelarAgendamento(criados[0].id);
    const lista = await repo.listarAgendamentos(FILTRO_VAZIO);
    expect(lista.filter((a) => a.status === 'cancelado')).toHaveLength(1);
    expect(lista.filter((a) => a.status === 'confirmado')).toHaveLength(1);
  });
});

describe('Janela da recorrencia por semanas', () => {
  it('1 semana termina 6 dias depois, nao 7', () => {
    // Segunda 03/08/2026 + 1 semana => domingo 09/08. Se fosse +7 dias,
    // cairia na segunda 10/08 e geraria uma segunda-feira extra.
    const fim = fimDaJanela(new Date(2026, 7, 3), 1);
    expect(fim.getDate()).toBe(9);
    expect(fim.getMonth()).toBe(7);
  });

  it('N semanas com um dia marcado geram exatamente N ocorrencias', () => {
    const inicio = new Date(2026, 7, 3); // segunda-feira
    for (const semanas of [1, 4, 12]) {
      const ocorrencias = gerarOcorrencias({
        ...base({
          servicos: so('creche'),
          dataHoraInicio: comHorario(inicio, '08:00'),
          dataHoraFim: comHorario(fimDaJanela(inicio, semanas), '18:00'),
          recorrente: true,
          diasSemanaRecorrencia: [1],
          planoEstadia: { ...planoVazio, horarioEntrada: '08:00', horarioSaida: '18:00' },
        }),
      });
      expect(ocorrencias).toHaveLength(semanas);
    }
  });

  it('tres dias por semana em 4 semanas geram 12 ocorrencias', () => {
    const inicio = new Date(2026, 7, 3);
    const ocorrencias = gerarOcorrencias(
      base({
        servicos: so('creche'),
        dataHoraInicio: comHorario(inicio, '08:00'),
        dataHoraFim: comHorario(fimDaJanela(inicio, 4), '18:00'),
        recorrente: true,
        diasSemanaRecorrencia: [1, 3, 5],
        planoEstadia: { ...planoVazio, horarioEntrada: '08:00', horarioSaida: '18:00' },
      }),
    );
    expect(ocorrencias).toHaveLength(12);
  });

  it('o horario vem do plano, nao da data informada', () => {
    const inicio = new Date(2026, 7, 3, 23, 45); // hora irrelevante
    const [primeira] = gerarOcorrencias(
      base({
        servicos: so('creche'),
        dataHoraInicio: comHorario(inicio, '07:30'),
        dataHoraFim: comHorario(fimDaJanela(inicio, 1), '17:15'),
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: { ...planoVazio, horarioEntrada: '07:30', horarioSaida: '17:15' },
      }),
    );
    expect(primeira.inicio.getHours()).toBe(7);
    expect(primeira.inicio.getMinutes()).toBe(30);
    expect(primeira.fim?.getHours()).toBe(17);
  });

  it('comHorario ignora hora ausente sem virar data invalida', () => {
    const d = comHorario(new Date(2026, 7, 3, 14, 20), null);
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(3);
  });
});

describe('Dupla reserva do mesmo animal', () => {
  async function repoComAnimal() {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const animal = await repo.salvarAnimal({
      id: '',
      tutorId: tutor.id,
      nome: 'Rex',
      raca: null,
      idade: null,
      porte: null,
      peso: null,
      especie: null,
      sexo: null,
      castrado: null,
      docil: null,
      observacoes: null,
    });
    return { repo, animal };
  }

  it('recusa dois agendamentos sobrepostos para o mesmo animal', async () => {
    const { repo, animal } = await repoComAnimal();

    await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    await expect(
      repo.criarAgendamento(
        base({
          animalIds: [animal.id],
          servicos: so('creche'),
          dataHoraInicio: new Date(2026, 8, 12, 8),
          dataHoraFim: new Date(2026, 8, 12, 18),
          status: 'solicitado',
          planoEstadia: planoCreche,
        }),
      ),
    ).rejects.toThrow(/mesmo período|neste período/i);
  });

  it('permite quando o existente esta cancelado', async () => {
    const { repo, animal } = await repoComAnimal();

    const [criado] = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );
    await repo.cancelarAgendamento(criado.id);

    const novos = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('creche'),
        dataHoraInicio: new Date(2026, 8, 12, 8),
        dataHoraFim: new Date(2026, 8, 12, 18),
        status: 'solicitado',
        planoEstadia: planoCreche,
      }),
    );
    expect(novos).toHaveLength(1);
  });

  it('editar o proprio agendamento nao conflita consigo mesmo', async () => {
    const { repo, animal } = await repoComAnimal();

    const [criado] = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    const atualizado = await repo.atualizarAgendamento(criado.id, {
      ...base({
        animalIds: [animal.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 11, 9),
        dataHoraFim: new Date(2026, 8, 15, 18),
        status: 'confirmado',
      }),
    });
    expect(atualizado.dataHoraInicio.getDate()).toBe(11);
  });

  it('serie recorrente conflitante nao grava nada pela metade', async () => {
    const { repo, animal } = await repoComAnimal();

    // Ocupa uma quarta-feira no meio do periodo da serie.
    await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 7, 12, 9),
        dataHoraFim: new Date(2026, 7, 12, 18),
        status: 'confirmado',
      }),
    );
    const antes = (await repo.listarAgendamentos(FILTRO_VAZIO)).length;

    await expect(
      repo.criarAgendamento(
        base({
          animalIds: [animal.id],
          servicos: so('creche'),
          dataHoraInicio: new Date(2026, 7, 3, 9),
          dataHoraFim: new Date(2026, 7, 28, 18),
          status: 'confirmado',
          recorrente: true,
          diasSemanaRecorrencia: [3], // quartas
          planoEstadia: planoCreche,
        }),
      ),
    ).rejects.toThrow();

    // Nenhuma ocorrencia parcial: no banco a RPC e transacional.
    const depois = (await repo.listarAgendamentos(FILTRO_VAZIO)).length;
    expect(depois).toBe(antes);
  });
});

describe('Varios caes no mesmo agendamento', () => {
  async function tutorComDoisCaes() {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const criar = (nome: string) =>
      repo.salvarAnimal({
        id: '',
        tutorId: tutor.id,
        nome,
        raca: null,
        idade: null,
        porte: null,
        peso: null,
        especie: null,
        sexo: null,
        castrado: null,
        docil: null,
        observacoes: null,
      });
    return { repo, tutor, rex: await criar('Rex'), toby: await criar('Toby') };
  }

  it('um agendamento atende dois caes do mesmo tutor', async () => {
    const { repo, rex, toby } = await tutorComDoisCaes();

    const [criado] = await repo.criarAgendamento(
      base({
        animalIds: [rex.id, toby.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    // Um unico agendamento, nao dois.
    expect(criado.animalIds).toHaveLength(2);
    expect((await repo.listarAgendamentos(FILTRO_VAZIO))).toHaveLength(1);
    expect(criado.animais?.map((a) => a.nome).sort()).toEqual(['Rex', 'Toby']);
  });

  it('basta um cao em comum para haver sobreposicao', async () => {
    const { repo, rex, toby } = await tutorComDoisCaes();

    await repo.criarAgendamento(
      base({
        animalIds: [rex.id, toby.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    // So o Toby se repete — e ja basta, como na constraint do banco.
    await expect(
      repo.criarAgendamento(
        base({
          animalIds: [toby.id],
          servicos: so('creche'),
          dataHoraInicio: new Date(2026, 8, 12, 8),
          dataHoraFim: new Date(2026, 8, 12, 18),
          status: 'solicitado',
          planoEstadia: planoCreche,
        }),
      ),
    ).rejects.toThrow(/mesmo período|neste período/i);
  });

  it('caes diferentes no mesmo periodo convivem', async () => {
    const { repo, rex, toby } = await tutorComDoisCaes();

    await repo.criarAgendamento(
      base({
        animalIds: [rex.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    const novos = await repo.criarAgendamento(
      base({
        animalIds: [toby.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );
    expect(novos).toHaveLength(1);
  });

  it('filtro por tutor encontra o agendamento pelos caes', async () => {
    const { repo, tutor, rex, toby } = await tutorComDoisCaes();

    await repo.criarAgendamento(
      base({
        animalIds: [rex.id, toby.id],
        servicos: so('hotel'),
        dataHoraInicio: new Date(2026, 8, 10, 9),
        dataHoraFim: new Date(2026, 8, 14, 18),
        status: 'confirmado',
      }),
    );

    const porTutor = await repo.listarAgendamentos({
      ...FILTRO_VAZIO,
      tutorId: tutor.id,
    });
    expect(porTutor).toHaveLength(1);

    const porAnimal = await repo.listarAgendamentos({
      ...FILTRO_VAZIO,
      animalId: toby.id,
    });
    expect(porAnimal).toHaveLength(1);

    const outro = await repo.listarAgendamentos({
      ...FILTRO_VAZIO,
      animalId: 'inexistente',
    });
    expect(outro).toHaveLength(0);
  });
});

describe('Ocorrencias de uma serie', () => {
  it('devolve a serie inteira em ordem, inclusive canceladas', async () => {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const animal = await repo.salvarAnimal({
      id: '',
      tutorId: tutor.id,
      nome: 'Rex',
      raca: null,
      idade: null,
      porte: null,
      peso: null,
      especie: null,
      sexo: null,
      castrado: null,
      docil: null,
      observacoes: null,
    });

    const inicio = new Date(2026, 7, 3);
    const criados = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('creche'),
        dataHoraInicio: comHorario(inicio, '08:00'),
        dataHoraFim: comHorario(fimDaJanela(inicio, 4), '18:00'),
        status: 'confirmado',
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: {
          ...planoVazio,
          horarioEntrada: '08:00',
          horarioSaida: '18:00',
        },
      }),
    );
    expect(criados).toHaveLength(4);

    const serieId = criados[0].agendamentoRecorrenciaId!;
    await repo.cancelarAgendamento(criados[1].id);

    const serie = await repo.listarOcorrencias(serieId);

    // Cancelar nao remove: o historico da serie continua completo.
    expect(serie).toHaveLength(4);
    expect(serie.filter((o) => o.status === 'cancelado')).toHaveLength(1);

    const datas = serie.map((o) => o.dataHoraInicio.getTime());
    expect([...datas].sort((a, b) => a - b)).toEqual(datas);
  });

  it('cancelar a serie preserva o que ja aconteceu', async () => {
    const repo = new RepositorioFake(false);
    const tutor = await repo.salvarTutor({
      id: '',
      nomeCompleto: 'Tutor',
      endereco: null,
      rg: null,
      cpfCnpj: '123',
      telefone: null,
      email: null,
    });
    const animal = await repo.salvarAnimal({
      id: '',
      tutorId: tutor.id,
      nome: 'Rex',
      raca: null,
      idade: null,
      porte: null,
      peso: null,
      especie: null,
      sexo: null,
      castrado: null,
      docil: null,
      observacoes: null,
    });

    // Segundas de 03/08 a 31/08/2026: dias 03, 10, 17, 24, 31.
    const inicio = new Date(2026, 7, 3);
    const criados = await repo.criarAgendamento(
      base({
        animalIds: [animal.id],
        servicos: so('creche'),
        dataHoraInicio: comHorario(inicio, '08:00'),
        dataHoraFim: comHorario(fimDaJanela(inicio, 5), '18:00'),
        status: 'confirmado',
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: {
          ...planoVazio,
          horarioEntrada: '08:00',
          horarioSaida: '18:00',
        },
      }),
    );
    expect(criados).toHaveLength(5);
    const serieId = criados[0].agendamentoRecorrenciaId!;

    // Corte no dia 18: as duas primeiras (03 e 10) e a do dia 17 ja passaram.
    const canceladas = await repo.cancelarSerie(serieId, new Date(2026, 7, 18));

    expect(canceladas).toHaveLength(2);
    expect(canceladas.map((o) => o.dataHoraInicio.getDate())).toEqual([24, 31]);

    const serie = await repo.listarOcorrencias(serieId);
    const passadas = serie.filter((o) => o.dataHoraInicio.getDate() <= 17);
    expect(passadas.every((o) => o.status === 'confirmado')).toBe(true);
  });

  it('cancelar a serie duas vezes nao recancela nada', async () => {
    const repo = new RepositorioFake();
    const todos = await repo.listarAgendamentos(FILTRO_VAZIO);
    const serieId = todos.find((a) => a.agendamentoRecorrenciaId)!
      .agendamentoRecorrenciaId!;

    const passado = new Date(2000, 0, 1);
    const primeira = await repo.cancelarSerie(serieId, passado);
    expect(primeira.length).toBeGreaterThan(0);

    // Idempotente: nada sobrou para cancelar.
    const segunda = await repo.cancelarSerie(serieId, passado);
    expect(segunda).toHaveLength(0);
  });

  it('ignora ocorrencias de outras series', async () => {
    const repo = new RepositorioFake();
    const todos = await repo.listarAgendamentos(FILTRO_VAZIO);
    const comSerie = todos.find((a) => a.agendamentoRecorrenciaId);
    expect(comSerie).toBeDefined();

    const serie = await repo.listarOcorrencias(
      comSerie!.agendamentoRecorrenciaId!,
    );
    expect(serie.length).toBeGreaterThan(0);
    for (const o of serie) {
      expect(o.agendamentoRecorrenciaId).toBe(
        comSerie!.agendamentoRecorrenciaId,
      );
    }
  });
});

describe('Aviso de falha de sincronizacao', () => {
  it('o campo nasce nulo e sobrevive a leitura', async () => {
    const repo = new RepositorioFake();
    const lista = await repo.listarAgendamentos(FILTRO_VAZIO);

    // Sem integracao no modo memoria, nada falha — mas o campo existe, e e
    // isso que o cartao consulta. Se sumisse do modelo, o aviso silenciaria.
    expect(lista.length).toBeGreaterThan(0);
    for (const a of lista) {
      expect(a).toHaveProperty('googleSyncErro');
      expect(a.googleSyncErro).toBeNull();
    }
  });

  it('uma ocorrencia com erro marca a serie inteira', async () => {
    const repo = new RepositorioFake();
    const lista = await repo.listarAgendamentos(FILTRO_VAZIO);
    const serieId = lista.find((a) => a.agendamentoRecorrenciaId)!
      .agendamentoRecorrenciaId!;
    const serie = await repo.listarOcorrencias(serieId);

    // Reproduz a contagem que o cartao faz: uma falha ja basta para avisar,
    // porque o Google e a unica visao por data depois que o calendario do
    // app saiu.
    const comErro = [
      { ...serie[0], googleSyncErro: 'Falha ao obter token do Google' },
      ...serie.slice(1),
    ];
    expect(comErro.filter((a) => a.googleSyncErro)).toHaveLength(1);
    expect(serie.filter((a) => a.googleSyncErro)).toHaveLength(0);
  });
});

describe('Dados de exemplo', () => {
  it('o repositorio fake vem populado e navegavel', async () => {
    const repo = new RepositorioFake();
    const animais = await repo.listarAnimais();
    const tutores = await repo.listarTutores();
    const agendamentos = await repo.listarAgendamentos(FILTRO_VAZIO);

    expect(tutores).toHaveLength(3);
    expect(animais).toHaveLength(4);
    // Visita + Hotel + Creche avulsa + 12 ocorrencias da serie recorrente
    // + Banho com Tosa.
    expect(agendamentos).toHaveLength(16);
    expect(animais.every((a) => a.tutor)).toBe(true);
  });
});
