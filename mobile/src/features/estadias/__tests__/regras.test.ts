import { RepositorioFake } from '../data/repositorio-fake';
import {
  gerarOcorrencias,
  validarAgendamento,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import { diaSemanaDe, type DiaSemana } from '../types/enums';
import { FILTRO_VAZIO } from '../types/modelos';

const base = (over: Partial<EntradaAgendamento> = {}): EntradaAgendamento => ({
  animalId: 'x',
  tipo: 'visita',
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
  valorTotal: null,
};

describe('Regras de negocio', () => {
  it('Visita nao aceita plano de estadia', () => {
    const erro = validarAgendamento(
      base({ tipo: 'visita', planoEstadia: planoVazio }),
    );
    expect(erro).toContain('Visita');
  });

  it('Hotel nao exige plano de estadia', () => {
    // O Hotel usa o proprio periodo como entrada/saida; o plano (rotina
    // diaria) nao se aplica.
    expect(validarAgendamento(base({ tipo: 'hotel' }))).toBeNull();
  });

  it('Hotel aceita apenas o valor da estadia', () => {
    const erro = validarAgendamento(
      base({
        tipo: 'hotel',
        dataHoraFim: new Date(2026, 7, 14),
        planoEstadia: { ...planoVazio, valorTotal: 480 },
      }),
    );
    expect(erro).toBeNull();
  });

  it('Creche exige plano de estadia', () => {
    const erro = validarAgendamento(base({ tipo: 'creche' }));
    expect(erro).toContain('obrigatorio');
  });

  it('recorrencia so vale para Creche', () => {
    const erro = validarAgendamento(
      base({
        tipo: 'hotel',
        dataHoraFim: new Date(2026, 7, 28),
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: planoVazio,
      }),
    );
    expect(erro).toContain('Creche');
  });

  it('data final anterior a inicial e rejeitada', () => {
    const erro = validarAgendamento(
      base({ dataHoraInicio: new Date(2026, 7, 10), dataHoraFim: new Date(2026, 7, 9) }),
    );
    expect(erro).not.toBeNull();
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
      tipo: 'creche',
      dataHoraInicio: new Date(2026, 7, 3, 8),
      dataHoraFim: new Date(2026, 7, 28, 18),
      status: 'confirmado',
      recorrente: true,
      diasSemanaRecorrencia: [1, 3, 5] as DiaSemana[],
      planoEstadia: planoVazio,
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
        animalId: animal.id,
        tipo: 'creche',
        dataHoraInicio: new Date(2026, 7, 3, 8),
        dataHoraFim: new Date(2026, 7, 14, 18),
        status: 'confirmado',
        recorrente: true,
        diasSemanaRecorrencia: [1],
        planoEstadia: planoVazio,
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

describe('Dados de exemplo', () => {
  it('o repositorio fake vem populado e navegavel', async () => {
    const repo = new RepositorioFake();
    const animais = await repo.listarAnimais();
    const tutores = await repo.listarTutores();
    const agendamentos = await repo.listarAgendamentos(FILTRO_VAZIO);

    expect(tutores).toHaveLength(3);
    expect(animais).toHaveLength(4);
    // Visita + Hotel + Creche avulsa + 12 ocorrencias da serie recorrente.
    expect(agendamentos).toHaveLength(15);
    expect(animais.every((a) => a.tutor)).toBe(true);
  });
});
