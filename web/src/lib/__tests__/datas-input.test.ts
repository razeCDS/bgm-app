import { describe, expect, it } from 'vitest';

import {
  deInputData,
  deInputDataHora,
  paraInputData,
  paraInputDataHora,
} from '../datas-input';

describe('Conversao dos inputs nativos de data', () => {
  it('le a data no fuso local, sem voltar um dia', () => {
    // `new Date('2026-10-01')` daria 30/09 no Brasil — o bug que isto evita.
    const d = deInputData('2026-10-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(0);
  });

  it('le data e hora locais', () => {
    const d = deInputDataHora('2026-10-01T08:30')!;
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1, 8, 30]);
  });

  it('vazio ou invalido vira null', () => {
    expect(deInputData('')).toBeNull();
    expect(deInputData('2026-13-45')).toBeNull();
    expect(deInputDataHora('')).toBeNull();
  });

  it('ida e volta preserva o valor', () => {
    const d = new Date(2026, 0, 5, 14, 7);
    expect(paraInputData(d)).toBe('2026-01-05');
    expect(paraInputDataHora(d)).toBe('2026-01-05T14:07');
    expect(deInputDataHora(paraInputDataHora(d))!.getTime()).toBe(d.getTime());
  });

  it('null vira texto vazio, que o input entende como "sem valor"', () => {
    expect(paraInputData(null)).toBe('');
    expect(paraInputDataHora(null)).toBe('');
  });
});
