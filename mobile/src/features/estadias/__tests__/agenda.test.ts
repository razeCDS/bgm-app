import {
  chaveDia,
  diasNoIntervalo,
  semanasDoMes,
} from '../../../components/calendario';

describe('Grade do mes', () => {
  it('sempre monta 6 semanas de 7 dias', () => {
    // Meses com formatos diferentes: 1o dia no domingo, no meio, e fevereiro.
    for (const mes of [
      new Date(2026, 7, 15), // agosto/2026
      new Date(2026, 1, 10), // fevereiro/2026
      new Date(2027, 7, 3), // agosto/2027 (comeca no domingo)
    ]) {
      const semanas = semanasDoMes(mes);
      expect(semanas).toHaveLength(6);
      for (const semana of semanas) expect(semana).toHaveLength(7);
    }
  });

  it('comeca no domingo e cobre o mes inteiro', () => {
    const semanas = semanasDoMes(new Date(2026, 7, 15));
    const dias = semanas.flat();

    // Primeira celula e domingo (getDay() === 0).
    expect(dias[0].getDay()).toBe(0);

    // Todos os dias de agosto/2026 estao presentes.
    const chaves = new Set(dias.map(chaveDia));
    for (let d = 1; d <= 31; d++) {
      expect(chaves.has(chaveDia(new Date(2026, 7, d)))).toBe(true);
    }
  });

  it('inclui dias vizinhos para completar as bordas', () => {
    // 01/08/2026 e um sabado, entao a primeira semana traz julho.
    const dias = semanasDoMes(new Date(2026, 7, 15)).flat();
    const temJulho = dias.some((d) => d.getMonth() === 6);
    expect(temJulho).toBe(true);
  });
});

describe('Dias ocupados por um agendamento', () => {
  it('estadia de varios dias marca todos os dias do intervalo', () => {
    // Hospedagem de 18 a 22/08 => 5 dias, nao apenas a entrada.
    const dias = diasNoIntervalo(
      new Date(2026, 7, 18, 9),
      new Date(2026, 7, 22, 18),
    );
    expect(dias).toHaveLength(5);
    expect(dias.map((d) => d.getDate())).toEqual([18, 19, 20, 21, 22]);
  });

  it('sem data final, marca so o dia de inicio', () => {
    const dias = diasNoIntervalo(new Date(2026, 7, 10, 14), null);
    expect(dias).toHaveLength(1);
    expect(dias[0].getDate()).toBe(10);
  });

  it('mesmo dia com entrada e saida conta uma vez', () => {
    const dias = diasNoIntervalo(
      new Date(2026, 7, 5, 8),
      new Date(2026, 7, 5, 17),
    );
    expect(dias).toHaveLength(1);
  });

  it('atravessa a virada de mes', () => {
    const dias = diasNoIntervalo(
      new Date(2026, 6, 30, 9),
      new Date(2026, 7, 2, 18),
    );
    expect(dias.map(chaveDia)).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });

  it('data final anterior a inicial nao gera intervalo invertido', () => {
    const dias = diasNoIntervalo(
      new Date(2026, 7, 10),
      new Date(2026, 7, 8),
    );
    expect(dias).toHaveLength(1);
  });
});
