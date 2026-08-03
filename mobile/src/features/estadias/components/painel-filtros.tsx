import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SeletorDataHora } from '../../../components/campos';
import { formatarData } from '../../../lib/formatadores';
import { cores } from '../../../theme/cores';
import { espaco, estilos, raio } from '../../../theme/estilos';
import { useAnimais, useFiltroAgendamentos, useTutores } from '../hooks';
import {
  rotuloStatus,
  rotuloTipo,
  STATUS_AGENDAMENTO,
  TIPOS_AGENDAMENTO,
} from '../types/enums';
import {
  filtroEstaVazio,
  quantidadeFiltrosAtivos,
  type FiltroAgendamentos,
} from '../types/modelos';

/**
 * Painel de filtros combinaveis da aba Agendamentos.
 * Todos se acumulam: animal E tutor E tipo E status E periodo.
 */
export function PainelFiltros() {
  const { filtro, definir, limparTudo } = useFiltroAgendamentos();
  const animais = useAnimais();
  const tutores = useTutores();
  const [periodoAberto, setPeriodoAberto] = useState(false);

  const nomeAnimal = animais.data?.find((a) => a.id === filtro.animalId)?.nome;
  const nomeTutor = tutores.data?.find(
    (t) => t.id === filtro.tutorId,
  )?.nomeCompleto;

  const temPeriodo = !!filtro.dataInicio || !!filtro.dataFim;

  return (
    <View style={s.painel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.linha}>
          <ChipMenu
            rotulo="Tipo"
            selecionado={filtro.tipo ? rotuloTipo[filtro.tipo] : null}
            opcoes={TIPOS_AGENDAMENTO.map((t) => ({
              chave: t,
              texto: rotuloTipo[t],
            }))}
            aoSelecionar={(v) =>
              definir({ ...filtro, tipo: v as FiltroAgendamentos['tipo'] })
            }
          />
          <ChipMenu
            rotulo="Status"
            selecionado={filtro.status ? rotuloStatus[filtro.status] : null}
            opcoes={STATUS_AGENDAMENTO.map((v) => ({
              chave: v,
              texto: rotuloStatus[v],
            }))}
            aoSelecionar={(v) =>
              definir({ ...filtro, status: v as FiltroAgendamentos['status'] })
            }
          />
          <ChipMenu
            rotulo="Animal"
            selecionado={nomeAnimal ?? null}
            opcoes={(animais.data ?? []).map((a) => ({
              chave: a.id,
              texto: a.nome,
            }))}
            aoSelecionar={(v) => definir({ ...filtro, animalId: v })}
          />
          <ChipMenu
            rotulo="Tutor"
            selecionado={nomeTutor ?? null}
            opcoes={(tutores.data ?? []).map((t) => ({
              chave: t.id,
              texto: t.nomeCompleto,
            }))}
            aoSelecionar={(v) => definir({ ...filtro, tutorId: v })}
          />
          <Chip
            ativo={temPeriodo}
            texto={textoPeriodo(filtro)}
            aoTocar={() => setPeriodoAberto(true)}
            aoLimpar={
              temPeriodo
                ? () => definir({ ...filtro, dataInicio: null, dataFim: null })
                : undefined
            }
          />
        </View>
      </ScrollView>

      {!filtroEstaVazio(filtro) ? (
        <View style={s.rodape}>
          <Text style={s.contador}>
            {quantidadeFiltrosAtivos(filtro)}{' '}
            {quantidadeFiltrosAtivos(filtro) === 1
              ? 'filtro ativo'
              : 'filtros ativos'}
          </Text>
          <Pressable onPress={limparTudo} hitSlop={8}>
            <Text style={s.limparTudo}>Limpar tudo</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={periodoAberto} transparent animationType="fade">
        <Pressable style={s.fundo} onPress={() => setPeriodoAberto(false)}>
          <Pressable style={s.caixa} onPress={(e) => e.stopPropagation()}>
            <Text style={s.tituloModal}>Período</Text>
            <SeletorDataHora
              rotulo="De"
              apenasData
              valor={filtro.dataInicio}
              aoMudar={(d) =>
                definir({
                  ...filtro,
                  dataInicio: new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                  ),
                })
              }
              aoLimpar={() => definir({ ...filtro, dataInicio: null })}
            />
            <SeletorDataHora
              rotulo="Até"
              apenasData
              valor={filtro.dataFim}
              aoMudar={(d) =>
                definir({
                  ...filtro,
                  // Inclui o dia final inteiro.
                  dataFim: new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                    23,
                    59,
                    59,
                  ),
                })
              }
              aoLimpar={() => definir({ ...filtro, dataFim: null })}
            />
            <Pressable
              style={estilos.botaoPrimario}
              onPress={() => setPeriodoAberto(false)}
            >
              <Text style={estilos.botaoPrimarioTexto}>Aplicar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function textoPeriodo(f: FiltroAgendamentos): string {
  if (!f.dataInicio && !f.dataFim) return 'Período';
  const ini = f.dataInicio ? formatarData(f.dataInicio) : '…';
  const fim = f.dataFim ? formatarData(f.dataFim) : '…';
  return `${ini} — ${fim}`;
}

function ChipMenu({
  rotulo,
  selecionado,
  opcoes,
  aoSelecionar,
}: {
  rotulo: string;
  selecionado: string | null;
  opcoes: Array<{ chave: string; texto: string }>;
  aoSelecionar: (v: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Chip
        ativo={!!selecionado}
        texto={selecionado ?? rotulo}
        aoTocar={() => setAberto(true)}
        aoLimpar={selecionado ? () => aoSelecionar(null) : undefined}
      />
      <Modal visible={aberto} transparent animationType="fade">
        <Pressable style={s.fundo} onPress={() => setAberto(false)}>
          <Pressable style={s.caixa} onPress={(e) => e.stopPropagation()}>
            <Text style={s.tituloModal}>{rotulo}</Text>
            <ScrollView>
              <Pressable
                style={s.opcao}
                onPress={() => {
                  aoSelecionar(null);
                  setAberto(false);
                }}
              >
                <Text style={s.opcaoTexto}>Todos — {rotulo}</Text>
              </Pressable>
              {opcoes.map((o) => (
                <Pressable
                  key={o.chave}
                  style={s.opcao}
                  onPress={() => {
                    aoSelecionar(o.chave);
                    setAberto(false);
                  }}
                >
                  <Text style={s.opcaoTexto}>{o.texto}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Chip({
  ativo,
  texto,
  aoTocar,
  aoLimpar,
}: {
  ativo: boolean;
  texto: string;
  aoTocar: () => void;
  aoLimpar?: () => void;
}) {
  return (
    <Pressable onPress={aoTocar} style={[s.chip, ativo && s.chipAtivo]}>
      <Text style={[s.chipTexto, ativo && s.chipTextoAtivo]}>{texto}</Text>
      {ativo && aoLimpar ? (
        <Pressable onPress={aoLimpar} hitSlop={8}>
          <Text style={s.chipFechar}>✕</Text>
        </Pressable>
      ) : (
        <Text style={[s.seta, ativo && s.chipTextoAtivo]}>▾</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  painel: {
    backgroundColor: cores.neutraClara,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm + 2,
  },
  linha: { flexDirection: 'row', gap: espaco.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.pill,
    backgroundColor: cores.branco,
    borderWidth: 1,
    borderColor: cores.neutra,
  },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { fontSize: 13, color: cores.textoEscuro },
  chipTextoAtivo: { color: cores.branco, fontWeight: '600' },
  chipFechar: { color: cores.branco, fontSize: 12 },
  seta: { color: cores.textoSuave, fontSize: 12 },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.sm,
  },
  contador: { fontSize: 12, color: cores.textoSuave },
  limparTudo: { fontSize: 13, color: cores.primaria, fontWeight: '600' },
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: espaco.xxl,
  },
  caixa: {
    backgroundColor: cores.branco,
    borderRadius: raio.lg,
    padding: espaco.lg,
    maxHeight: '70%',
  },
  tituloModal: {
    fontSize: 16,
    fontWeight: '700',
    color: cores.primariaEscura,
    marginBottom: espaco.md,
  },
  opcao: { paddingVertical: espaco.md, paddingHorizontal: espaco.sm },
  opcaoTexto: { fontSize: 15, color: cores.textoEscuro },
});
