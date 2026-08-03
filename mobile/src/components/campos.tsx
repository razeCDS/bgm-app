import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { formatarData, formatarDataHora } from '../lib/formatadores';
import { cores } from '../theme/cores';
import { espaco, estilos, raio } from '../theme/estilos';

// ── Texto ─────────────────────────────────────────────────────────────────

export function Campo({
  rotulo,
  valor,
  aoMudar,
  teclado,
  multilinha,
  prefixo,
  erro,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  teclado?: KeyboardTypeOptions;
  multilinha?: boolean;
  prefixo?: string;
  erro?: string | null;
}) {
  return (
    <View style={s.bloco}>
      <Text style={estilos.rotuloCampo}>{rotulo}</Text>
      <View style={s.campoLinha}>
        {prefixo ? <Text style={s.prefixo}>{prefixo}</Text> : null}
        <TextInput
          value={valor}
          onChangeText={aoMudar}
          keyboardType={teclado}
          multiline={multilinha}
          style={[
            estilos.campo,
            s.flex,
            multilinha ? s.multilinha : null,
            prefixo ? s.comPrefixo : null,
            erro ? s.campoErro : null,
          ]}
          placeholderTextColor={cores.textoSuave}
        />
      </View>
      {erro ? <Text style={s.erroTexto}>{erro}</Text> : null}
    </View>
  );
}

// ── Selecao (RN nao tem dropdown nativo) ──────────────────────────────────

export function Seletor<T extends string>({
  rotulo,
  valor,
  opcoes,
  rotuloDe,
  aoSelecionar,
  permiteVazio,
  textoVazio = 'Todos',
}: {
  rotulo: string;
  valor: T | null;
  opcoes: readonly T[];
  rotuloDe: (v: T) => string;
  aoSelecionar: (v: T | null) => void;
  permiteVazio?: boolean;
  textoVazio?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <View style={s.bloco}>
      <Text style={estilos.rotuloCampo}>{rotulo}</Text>
      <Pressable
        onPress={() => setAberto(true)}
        style={[estilos.campoCaixa, s.seletor]}
      >
        <Text style={valor ? s.seletorTexto : s.seletorVazio}>
          {valor ? rotuloDe(valor) : 'Selecionar'}
        </Text>
        <Text style={s.seta}>▾</Text>
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade">
        <Pressable style={s.fundoModal} onPress={() => setAberto(false)}>
          <Pressable style={s.caixaModal} onPress={(e) => e.stopPropagation()}>
            <Text style={s.tituloModal}>{rotulo}</Text>
            <ScrollView>
              {permiteVazio ? (
                <Pressable
                  style={s.opcao}
                  onPress={() => {
                    aoSelecionar(null);
                    setAberto(false);
                  }}
                >
                  <Text style={s.opcaoTexto}>{textoVazio}</Text>
                </Pressable>
              ) : null}
              {opcoes.map((o) => (
                <Pressable
                  key={o}
                  style={[s.opcao, o === valor ? s.opcaoAtiva : null]}
                  onPress={() => {
                    aoSelecionar(o);
                    setAberto(false);
                  }}
                >
                  <Text
                    style={[
                      s.opcaoTexto,
                      o === valor ? s.opcaoTextoAtivo : null,
                    ]}
                  >
                    {rotuloDe(o)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Data / hora ───────────────────────────────────────────────────────────

export function SeletorDataHora({
  rotulo,
  valor,
  aoMudar,
  aoLimpar,
  apenasData,
}: {
  rotulo: string;
  valor: Date | null;
  aoMudar: (d: Date) => void;
  aoLimpar?: () => void;
  apenasData?: boolean;
}) {
  const [modo, setModo] = useState<'date' | 'time' | null>(null);
  const [parcial, setParcial] = useState<Date | null>(null);

  const base = valor ?? new Date();

  return (
    <View style={s.bloco}>
      <Text style={estilos.rotuloCampo}>{rotulo}</Text>
      <View style={s.linhaData}>
        <Pressable
          onPress={() => setModo('date')}
          style={[estilos.campoCaixa, s.flex]}
        >
          <Text style={valor ? s.seletorTexto : s.seletorVazio}>
            {valor
              ? apenasData
                ? formatarData(valor)
                : formatarDataHora(valor)
              : 'Definir'}
          </Text>
        </Pressable>
        {valor && aoLimpar ? (
          <Pressable onPress={aoLimpar} style={s.limpar}>
            <Text style={s.limparTexto}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {modo ? (
        <DateTimePicker
          value={parcial ?? base}
          mode={modo}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(evento, escolhida) => {
            if (evento.type === 'dismissed' || !escolhida) {
              setModo(null);
              setParcial(null);
              return;
            }
            if (modo === 'date') {
              if (apenasData) {
                setModo(null);
                aoMudar(escolhida);
                return;
              }
              // Encadeia a escolha da hora logo apos a data.
              setParcial(escolhida);
              setModo('time');
              return;
            }
            const d = parcial ?? base;
            setModo(null);
            setParcial(null);
            aoMudar(
              new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate(),
                escolhida.getHours(),
                escolhida.getMinutes(),
              ),
            );
          }}
        />
      ) : null}
    </View>
  );
}

/** Hora do dia isolada ("HH:mm"), usada no plano de estadia da creche. */
export function SeletorHora({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: string | null;
  aoMudar: (hhmm: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  const base = new Date();
  if (valor) {
    const [h, m] = valor.split(':').map(Number);
    base.setHours(h ?? 8, m ?? 0, 0, 0);
  }

  return (
    <View style={[s.bloco, s.flex]}>
      <Text style={estilos.rotuloCampo}>{rotulo}</Text>
      <Pressable onPress={() => setAberto(true)} style={estilos.campoCaixa}>
        <Text style={valor ? s.seletorTexto : s.seletorVazio}>
          {valor ?? '--:--'}
        </Text>
      </Pressable>
      {aberto ? (
        <DateTimePicker
          value={base}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(evento, escolhida) => {
            setAberto(false);
            if (evento.type === 'dismissed' || !escolhida) return;
            const hh = String(escolhida.getHours()).padStart(2, '0');
            const mm = String(escolhida.getMinutes()).padStart(2, '0');
            aoMudar(`${hh}:${mm}`);
          }}
        />
      ) : null}
    </View>
  );
}

// ── Booleano ──────────────────────────────────────────────────────────────

export function LinhaSwitch({
  titulo,
  descricao,
  valor,
  aoMudar,
}: {
  titulo: string;
  descricao?: string;
  valor: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <View style={s.linhaSwitch}>
      <View style={s.flex}>
        <Text style={s.switchTitulo}>{titulo}</Text>
        {descricao ? <Text style={s.switchDescricao}>{descricao}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ true: cores.primariaClara, false: cores.neutra }}
        thumbColor={valor ? cores.primaria : cores.branco}
      />
    </View>
  );
}

// ── Secao ─────────────────────────────────────────────────────────────────

export function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.secao}>
      <Text style={s.secaoTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  bloco: { marginBottom: espaco.md + 2 },
  flex: { flex: 1 },
  campoLinha: { flexDirection: 'row', alignItems: 'center' },
  prefixo: {
    position: 'absolute',
    left: espaco.md,
    zIndex: 1,
    color: cores.textoSuave,
  },
  comPrefixo: { paddingLeft: espaco.xxl + 12 },
  multilinha: { minHeight: 80, textAlignVertical: 'top' },
  campoErro: { borderWidth: 1, borderColor: cores.erro },
  erroTexto: { color: cores.erro, fontSize: 12, marginTop: espaco.xs },

  seletor: { flexDirection: 'row', alignItems: 'center' },
  seletorTexto: { flex: 1, fontSize: 15, color: cores.textoEscuro },
  seletorVazio: { flex: 1, fontSize: 15, color: cores.textoSuave },
  seta: { color: cores.textoSuave, fontSize: 14 },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: espaco.xxl,
  },
  caixaModal: {
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
  opcao: {
    paddingVertical: espaco.md,
    paddingHorizontal: espaco.sm,
    borderRadius: raio.sm,
  },
  opcaoAtiva: { backgroundColor: cores.primariaTenue },
  opcaoTexto: { fontSize: 15, color: cores.textoEscuro },
  opcaoTextoAtivo: { fontWeight: '700', color: cores.primariaEscura },

  linhaData: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  limpar: { padding: espaco.sm },
  limparTexto: { color: cores.textoSuave, fontSize: 16 },

  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espaco.sm,
    gap: espaco.md,
  },
  switchTitulo: { fontSize: 15, color: cores.textoEscuro },
  switchDescricao: { fontSize: 12, color: cores.textoSuave, marginTop: 2 },

  secao: { marginBottom: espaco.xl },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: cores.primariaEscura,
    marginBottom: espaco.md,
  },
});
