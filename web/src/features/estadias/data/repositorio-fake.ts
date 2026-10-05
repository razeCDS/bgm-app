import {
  ERRO_SOBREPOSICAO,
  erroMudancaServicos,
  ErroValidacao,
  garantirValido,
  geraRecorrencia,
  gerarOcorrencias,
  periodoOcupado,
  periodosSobrepoem,
  type EntradaAgendamento,
} from '../types/entrada-agendamento';
import {
  ordenarServicos,
  servicosDe,
  type Agendamento,
  type Anamnese,
  type Animal,
  type ContatoEmergencia,
  type FichaAnimal,
  type FiltroAgendamentos,
  type PertencesDeixados,
  type PlanoEstadia,
  type TermoConsentimento,
  type Tutor,
  type VeterinarioInfo,
} from '../types/modelos';
import type { EstadiasRepositorio } from './repositorio';

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Latencia artificial para a UI exercitar estados de carregamento. */
const atraso = () => new Promise<void>((r) => setTimeout(r, 180));

/**
 * Implementacao em memoria, usada enquanto a integracao com o Supabase nao
 * esta ligada. Reproduz as mesmas regras de negocio da implementacao real,
 * inclusive a geracao de ocorrencias recorrentes.
 */
export class RepositorioFake implements EstadiasRepositorio {
  private tutores: Tutor[] = [];
  private animais: Animal[] = [];
  private veterinarios: VeterinarioInfo[] = [];
  private anamneses: Anamnese[] = [];
  private termos: TermoConsentimento[] = [];
  private contatos: ContatoEmergencia[] = [];
  private agendamentos: Agendamento[] = [];
  private planos: PlanoEstadia[] = [];
  private pertences: PertencesDeixados[] = [];

  constructor(comDadosDeExemplo = true) {
    if (comDadosDeExemplo) this.semear();
  }

  // ── Tutores ──

  async listarTutores(): Promise<Tutor[]> {
    await atraso();
    return [...this.tutores].sort((a, b) =>
      a.nomeCompleto.localeCompare(b.nomeCompleto),
    );
  }

  async salvarTutor(tutor: Tutor): Promise<Tutor> {
    await atraso();
    if (!tutor.id) {
      const novo = { ...tutor, id: uid() };
      this.tutores.push(novo);
      return novo;
    }
    const i = this.tutores.findIndex((t) => t.id === tutor.id);
    if (i < 0) throw new ErroValidacao('Tutor nao encontrado.');
    this.tutores[i] = tutor;
    return tutor;
  }

  // ── Animais ──

  private tutorDe(tutorId: string): Tutor {
    const t = this.tutores.find((x) => x.id === tutorId);
    if (!t) throw new ErroValidacao('Tutor nao encontrado.');
    return t;
  }

  async listarAnimais(busca?: string): Promise<Animal[]> {
    await atraso();
    const termo = (busca ?? '').trim().toLowerCase();
    return this.animais
      .map((a) => ({ ...a, tutor: this.tutorDe(a.tutorId) }))
      .filter((a) => {
        if (!termo) return true;
        return (
          a.nome.toLowerCase().includes(termo) ||
          (a.raca ?? '').toLowerCase().includes(termo) ||
          (a.tutor?.nomeCompleto ?? '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async obterFicha(animalId: string): Promise<FichaAnimal> {
    await atraso();
    const animal = this.animais.find((a) => a.id === animalId);
    if (!animal) throw new ErroValidacao('Animal nao encontrado.');
    const tutor = this.tutorDe(animal.tutorId);
    return {
      animal: { ...animal, tutor },
      tutor,
      veterinario: this.veterinarios.find((v) => v.animalId === animalId) ?? null,
      anamnese: this.anamneses.find((a) => a.animalId === animalId) ?? null,
      termo: this.termos.find((t) => t.animalId === animalId) ?? null,
      contatos: this.contatos
        .filter((c) => c.animalId === animalId)
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    };
  }

  async salvarAnimal(animal: Animal): Promise<Animal> {
    await atraso();
    if (!animal.id) {
      const novo = { ...animal, id: uid() };
      this.animais.push(novo);
      return novo;
    }
    const i = this.animais.findIndex((a) => a.id === animal.id);
    if (i < 0) throw new ErroValidacao('Animal nao encontrado.');
    this.animais[i] = animal;
    return animal;
  }

  async salvarFicha(ficha: FichaAnimal): Promise<FichaAnimal> {
    await atraso();
    const animalId = ficha.animal.id;

    this.veterinarios = this.veterinarios.filter((v) => v.animalId !== animalId);
    if (ficha.veterinario) {
      this.veterinarios.push({ ...ficha.veterinario, id: ficha.veterinario.id || uid() });
    }

    this.anamneses = this.anamneses.filter((a) => a.animalId !== animalId);
    if (ficha.anamnese) {
      this.anamneses.push({ ...ficha.anamnese, id: ficha.anamnese.id || uid() });
    }

    this.termos = this.termos.filter((t) => t.animalId !== animalId);
    if (ficha.termo) {
      this.termos.push({ ...ficha.termo, id: ficha.termo.id || uid() });
    }

    this.contatos = this.contatos.filter((c) => c.animalId !== animalId);
    this.contatos.push(
      ...ficha.contatos.map((c) => ({ ...c, id: c.id || uid() })),
    );

    return this.obterFicha(animalId);
  }

  // ── Agendamentos ──

  private hidratar(a: Agendamento): Agendamento {
    const animais = a.animalIds
      .map((id) => this.animais.find((x) => x.id === id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((x) => ({ ...x, tutor: this.tutorDe(x.tutorId) }));
    return {
      ...a,
      animais,
      planoEstadia: this.planos.find((p) => p.agendamentoId === a.id) ?? null,
      pertencesDeixados:
        this.pertences.find((p) => p.agendamentoId === a.id) ?? null,
    };
  }

  async listarAgendamentos(filtro: FiltroAgendamentos): Promise<Agendamento[]> {
    await atraso();
    return this.agendamentos
      .map((a) => this.hidratar(a))
      .filter((a) => {
        if (filtro.animalId && !a.animalIds.includes(filtro.animalId)) {
          return false;
        }
        if (
          filtro.tutorId &&
          !(a.animais ?? []).some((x) => x.tutorId === filtro.tutorId)
        ) {
          return false;
        }
        if (
          filtro.servico &&
          !a.servicos.some((s) => s.servico === filtro.servico)
        ) {
          return false;
        }
        if (filtro.status && a.status !== filtro.status) return false;
        // Intervalo: sobreposicao com o periodo informado.
        if (filtro.dataInicio) {
          const fim = a.dataHoraFim ?? a.dataHoraInicio;
          if (fim < filtro.dataInicio) return false;
        }
        if (filtro.dataFim && a.dataHoraInicio > filtro.dataFim) return false;
        return true;
      })
      .sort((a, b) => a.dataHoraInicio.getTime() - b.dataHoraInicio.getTime());
  }

  async obterAgendamento(id: string): Promise<Agendamento> {
    await atraso();
    const a = this.agendamentos.find((x) => x.id === id);
    if (!a) throw new ErroValidacao('Agendamento nao encontrado.');
    return this.hidratar(a);
  }

  async listarOcorrencias(recorrenciaId: string): Promise<Agendamento[]> {
    await atraso();
    return this.agendamentos
      .filter((a) => a.agendamentoRecorrenciaId === recorrenciaId)
      .sort(
        (a, b) => a.dataHoraInicio.getTime() - b.dataHoraInicio.getTime(),
      )
      .map((a) => this.hidratar(a));
  }

  /**
   * O mesmo animal nao pode ocupar dois periodos que se cruzam — a mesma
   * regra que a constraint `excl_animal_sem_sobreposicao` impoe no banco.
   * Cancelados nao contam.
   */
  private conflita(
    animalIds: string[],
    inicio: Date,
    fim: Date | null,
    ignorarId?: string,
  ): boolean {
    const novo = periodoOcupado(inicio, fim);
    return this.agendamentos.some((a) => {
      if (a.id === ignorarId) return false;
      // Basta UM animal em comum: a constraint do banco e por animal.
      if (!a.animalIds.some((id) => animalIds.includes(id))) return false;
      if (a.status === 'cancelado') return false;
      return periodosSobrepoem(
        novo,
        periodoOcupado(a.dataHoraInicio, a.dataHoraFim),
      );
    });
  }

  async criarAgendamento(entrada: EntradaAgendamento): Promise<Agendamento[]> {
    garantirValido(entrada);
    await atraso();

    if (!geraRecorrencia(entrada)) {
      if (this.conflita(entrada.animalIds, entrada.dataHoraInicio, entrada.dataHoraFim)) {
        throw new ErroValidacao(ERRO_SOBREPOSICAO);
      }
      return [this.inserirUm(entrada, entrada.dataHoraInicio, entrada.dataHoraFim)];
    }

    const ocorrencias = gerarOcorrencias(entrada);

    // Confere TODAS antes de gravar QUALQUER uma: no banco a RPC roda em
    // transacao unica, entao uma ocorrencia conflitante derruba a serie
    // inteira. Sem esta checagem previa, o modo em memoria deixaria metade
    // da serie gravada — divergindo do comportamento real.
    for (const { inicio, fim } of ocorrencias) {
      if (this.conflita(entrada.animalIds, inicio, fim)) {
        throw new ErroValidacao(ERRO_SOBREPOSICAO);
      }
    }

    const serieId = uid();
    return ocorrencias.map(({ inicio, fim }) =>
      this.inserirUm(entrada, inicio, fim, serieId),
    );
  }

  private inserirUm(
    e: EntradaAgendamento,
    inicio: Date,
    fim: Date | null,
    serieId?: string,
  ): Agendamento {
    const id = uid();
    const novo: Agendamento = {
      id,
      animalIds: [...e.animalIds],
      // Copia: numa serie, cada ocorrencia tem a sua lista (como no banco).
      servicos: ordenarServicos(e.servicos.map((s) => ({ ...s }))),
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      status: e.status,
      // A ocorrencia e o resultado da regra, nao a regra em si.
      recorrente: serieId ? false : e.recorrente,
      diasSemanaRecorrencia: serieId ? [] : e.diasSemanaRecorrencia,
      agendamentoRecorrenciaId: serieId ?? null,
      observacoes: e.observacoes,
      googleCalendarEventId: null,
      googleSyncErro: null,
    };
    this.agendamentos.push(novo);
    if (e.planoEstadia) {
      this.planos.push({ ...e.planoEstadia, id: uid(), agendamentoId: id });
    }
    if (e.pertencesDeixados) {
      this.pertences.push({
        ...e.pertencesDeixados,
        id: uid(),
        agendamentoId: id,
      });
    }
    return this.hidratar(novo);
  }

  async atualizarAgendamento(
    id: string,
    entrada: EntradaAgendamento,
  ): Promise<Agendamento> {
    garantirValido(entrada);
    await atraso();

    const i = this.agendamentos.findIndex((a) => a.id === id);
    if (i < 0) throw new ErroValidacao('Agendamento nao encontrado.');

    const erroServicos = erroMudancaServicos(
      servicosDe(this.agendamentos[i].servicos),
      servicosDe(entrada.servicos),
    );
    if (erroServicos) throw new ErroValidacao(erroServicos);

    // Ignora o proprio registro: mover um agendamento nao pode colidir
    // consigo mesmo.
    if (
      entrada.status !== 'cancelado' &&
      this.conflita(
        entrada.animalIds,
        entrada.dataHoraInicio,
        entrada.dataHoraFim,
        id,
      )
    ) {
      throw new ErroValidacao(ERRO_SOBREPOSICAO);
    }

    this.agendamentos[i] = {
      ...this.agendamentos[i],
      animalIds: [...entrada.animalIds],
      servicos: ordenarServicos(entrada.servicos.map((s) => ({ ...s }))),
      dataHoraInicio: entrada.dataHoraInicio,
      dataHoraFim: entrada.dataHoraFim,
      status: entrada.status,
      observacoes: entrada.observacoes,
    };

    this.planos = this.planos.filter((p) => p.agendamentoId !== id);
    if (entrada.planoEstadia) {
      this.planos.push({ ...entrada.planoEstadia, id: uid(), agendamentoId: id });
    }
    this.pertences = this.pertences.filter((p) => p.agendamentoId !== id);
    if (entrada.pertencesDeixados) {
      this.pertences.push({
        ...entrada.pertencesDeixados,
        id: uid(),
        agendamentoId: id,
      });
    }

    return this.hidratar(this.agendamentos[i]);
  }

  async cancelarAgendamento(id: string): Promise<Agendamento> {
    await atraso();
    const i = this.agendamentos.findIndex((a) => a.id === id);
    if (i < 0) throw new ErroValidacao('Agendamento nao encontrado.');
    this.agendamentos[i] = { ...this.agendamentos[i], status: 'cancelado' };
    return this.hidratar(this.agendamentos[i]);
  }

  async cancelarSerie(
    recorrenciaId: string,
    aPartirDe: Date,
  ): Promise<Agendamento[]> {
    await atraso();
    const corte = aPartirDe.getTime();
    const cancelados: Agendamento[] = [];

    this.agendamentos = this.agendamentos.map((a) => {
      const alvo =
        a.agendamentoRecorrenciaId === recorrenciaId &&
        a.status !== 'cancelado' &&
        a.dataHoraInicio.getTime() >= corte;
      if (!alvo) return a;
      const atualizado = { ...a, status: 'cancelado' as const };
      cancelados.push(this.hidratar(atualizado));
      return atualizado;
    });

    return cancelados.sort(
      (x, y) => x.dataHoraInicio.getTime() - y.dataHoraInicio.getTime(),
    );
  }

  // ── Dados de exemplo ──

  private semear(): void {
    const maria: Tutor = {
      id: uid(),
      nomeCompleto: 'Maria Silva',
      cpfCnpj: '123.456.789-00',
      rg: '12.345.678-9',
      endereco: 'Rua das Flores, 100 — São Paulo/SP',
      telefone: '(11) 99999-8888',
      email: 'maria.silva@email.com',
    };
    const joao: Tutor = {
      id: uid(),
      nomeCompleto: 'João Pereira',
      cpfCnpj: '987.654.321-00',
      rg: null,
      endereco: 'Av. Brasil, 2500 — Rio de Janeiro/RJ',
      telefone: '(21) 98888-7777',
      email: 'joao.pereira@email.com',
    };
    const ana: Tutor = {
      id: uid(),
      nomeCompleto: 'Ana Souza',
      cpfCnpj: '11.222.333/0001-44',
      rg: null,
      endereco: 'Rua do Comércio, 45 — Belo Horizonte/MG',
      telefone: '(31) 97777-6666',
      email: null,
    };
    this.tutores.push(maria, joao, ana);

    const rex: Animal = {
      id: uid(),
      tutorId: maria.id,
      nome: 'Rex',
      raca: 'Labrador',
      idade: 4,
      porte: 'medio',
      peso: 28.5,
      especie: 'canina',
      sexo: 'macho',
      castrado: true,
      docil: true,
      observacoes: 'Muito sociável, adora crianças.',
    };
    const mel: Animal = {
      id: uid(),
      tutorId: maria.id,
      nome: 'Mel',
      raca: 'Siamês',
      idade: 2,
      porte: 'pequeno',
      peso: 4.2,
      especie: 'felina',
      sexo: 'femea',
      castrado: true,
      docil: true,
      observacoes: 'Tímida com estranhos.',
    };
    const thor: Animal = {
      id: uid(),
      tutorId: joao.id,
      nome: 'Thor',
      raca: 'Rottweiler',
      idade: 5,
      porte: 'grande',
      peso: 45,
      especie: 'canina',
      sexo: 'macho',
      castrado: false,
      docil: false,
      observacoes: 'Manejo cuidadoso; reativo com outros machos.',
    };
    const luna: Animal = {
      id: uid(),
      tutorId: ana.id,
      nome: 'Luna',
      raca: 'Poodle',
      idade: 1,
      porte: 'mini',
      peso: 3.1,
      especie: 'canina',
      sexo: 'femea',
      castrado: false,
      docil: true,
      observacoes: 'Filhote cheio de energia.',
    };
    this.animais.push(rex, mel, thor, luna);

    this.veterinarios.push({
      id: uid(),
      animalId: rex.id,
      nomeVeterinario: 'Dr. Carlos Mendes',
      temEspecialidade: true,
      qualEspecialidade: 'Ortopedia',
      telefoneVeterinario: '(11) 3333-4444',
      nomeClinica: 'PetVida',
      telefoneClinica: '(11) 3333-0000',
      enderecoClinica: 'Rua dos Animais, 50 — São Paulo/SP',
    });

    this.anamneses.push(
      {
        id: uid(),
        animalId: rex.id,
        doencaPreexistente: false,
        doencaQual: null,
        alergias: 'Nenhuma conhecida',
        cuidadosEspeciais: false,
        cuidadosQual: null,
        tomaMedicacao: false,
        medicacaoQual: null,
        vermifugadoUltimoMes: true,
        dataVermifugo: new Date(2026, 6, 20),
        vacinadoEsteAno: true,
        dataVacinacao: new Date(2026, 2, 15),
        observacoes: 'Saudável.',
      },
      {
        id: uid(),
        animalId: thor.id,
        doencaPreexistente: true,
        doencaQual: 'Displasia coxofemoral leve',
        alergias: 'Frango',
        cuidadosEspeciais: true,
        cuidadosQual: 'Evitar exercícios de alto impacto',
        tomaMedicacao: true,
        medicacaoQual: 'Condroprotetor 1x/dia',
        vermifugadoUltimoMes: false,
        dataVermifugo: null,
        vacinadoEsteAno: true,
        dataVacinacao: new Date(2026, 4, 10),
        observacoes: 'Acompanhamento ortopédico semestral.',
      },
    );

    this.termos.push({
      id: uid(),
      animalId: rex.id,
      aceito: true,
      dataAceite: new Date(2026, 6, 25),
      localAceite: 'São Paulo/SP',
    });

    this.contatos.push(
      {
        id: uid(),
        animalId: rex.id,
        nome: 'Maria Silva',
        parentesco: 'Tutora',
        telefone: '(11) 99999-8888',
        ordem: 1,
      },
      {
        id: uid(),
        animalId: rex.id,
        nome: 'Pedro Silva',
        parentesco: 'Irmão',
        telefone: '(11) 96666-5555',
        ordem: 2,
      },
      {
        id: uid(),
        animalId: thor.id,
        nome: 'João Pereira',
        parentesco: 'Tutor',
        telefone: '(21) 98888-7777',
        ordem: 1,
      },
    );

    // Visita — sem plano nem pertences.
    this.inserirUm(
      {
        animalIds: [luna.id],
        servicos: [{ servico: 'visita', valor: null, data: null }],
        dataHoraInicio: new Date(2026, 7, 10, 14),
        dataHoraFim: new Date(2026, 7, 10, 15),
        status: 'solicitado',
        recorrente: false,
        diasSemanaRecorrencia: [],
        observacoes: 'Primeira visita para conhecer o espaço.',
        planoEstadia: null,
        pertencesDeixados: null,
      },
      new Date(2026, 7, 10, 14),
      new Date(2026, 7, 10, 15),
    );

    // Hotel com banho na saida — sem plano de rotina; valores e pertences.
    this.inserirUm(
      {
        animalIds: [thor.id],
        servicos: [
          { servico: 'hotel', valor: 480, data: null },
          // Banho num dia especifico da estadia: o ultimo, antes da saida.
          { servico: 'banho', valor: 70, data: new Date(2026, 7, 22) },
        ],
        dataHoraInicio: new Date(2026, 7, 18, 9),
        dataHoraFim: new Date(2026, 7, 22, 18),
        status: 'confirmado',
        recorrente: false,
        diasSemanaRecorrencia: [],
        observacoes: 'Hospedagem durante viagem do tutor. Banho no último dia.',
        planoEstadia: null,
        pertencesDeixados: {
          temCaminha: true,
          corCaminha: 'Cinza',
          temRoupa: false,
          corRoupa: null,
          temBrinquedo: true,
          qualBrinquedo: 'Mordedor de borracha',
          racao: 'Golden Grande Porte',
          quantidade: '300g',
          vezes: '2x ao dia',
          observacoes: 'Ração própria; não misturar com outras.',
        },
      },
      new Date(2026, 7, 18, 9),
      new Date(2026, 7, 22, 18),
    );

    // Creche avulsa com tosa.
    this.inserirUm(
      {
        animalIds: [mel.id],
        servicos: [
          { servico: 'creche', valor: 80, data: null },
          { servico: 'tosa_higienica', valor: 40, data: null },
        ],
        dataHoraInicio: new Date(2026, 7, 5, 8),
        dataHoraFim: new Date(2026, 7, 5, 17),
        status: 'em_andamento',
        recorrente: false,
        diasSemanaRecorrencia: [],
        observacoes: 'Creche por um dia.',
        planoEstadia: {
          tipoPlano: 'diaria',
          totalDias: 1,
          horarioEntrada: '08:00',
          horarioSaida: '17:00',
          formaPagamento: 'pix',
        },
        pertencesDeixados: null,
      },
      new Date(2026, 7, 5, 8),
      new Date(2026, 7, 5, 17),
    );

    // Creche recorrente — Seg/Qua/Sex ao longo de agosto. So o Rex: o Thor
    // esta no Hotel de 18 a 22/08 (e e de outro tutor), e com ele a serie
    // violaria a dupla reserva que o proprio app barra.
    const regra: EntradaAgendamento = {
      animalIds: [rex.id],
      servicos: [{ servico: 'creche', valor: 75, data: null }],
      dataHoraInicio: new Date(2026, 7, 3, 8),
      dataHoraFim: new Date(2026, 7, 28, 18),
      status: 'confirmado',
      recorrente: true,
      diasSemanaRecorrencia: [1, 3, 5],
      observacoes: 'Creche recorrente durante o mês.',
      planoEstadia: {
        tipoPlano: 'mensal',
        totalDias: null,
        horarioEntrada: '08:00',
        horarioSaida: '18:00',
        formaPagamento: 'dinheiro',
      },
      pertencesDeixados: null,
    };
    const serieId = uid();
    for (const { inicio, fim } of gerarOcorrencias(regra)) {
      this.inserirUm(regra, inicio, fim, serieId);
    }

    // So extras: banho e tosa, sem estadia.
    this.inserirUm(
      {
        animalIds: [luna.id],
        servicos: [
          { servico: 'banho', valor: 60, data: null },
          { servico: 'tosa_higienica', valor: 40, data: null },
        ],
        dataHoraInicio: new Date(2026, 7, 20, 10),
        dataHoraFim: new Date(2026, 7, 20, 11, 30),
        status: 'confirmado',
        recorrente: false,
        diasSemanaRecorrencia: [],
        observacoes: null,
        planoEstadia: null,
        pertencesDeixados: null,
      },
      new Date(2026, 7, 20, 10),
      new Date(2026, 7, 20, 11, 30),
    );
  }
}
