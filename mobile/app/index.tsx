import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessao } from '../src/features/auth/store';
import { emMemoria } from '../src/lib/repositorios';
import { cores } from '../src/theme/cores';
import { espaco, raio } from '../src/theme/estilos';

interface Modulo {
  titulo: string;
  icone: string;
  /** `null` significa modulo ainda nao implementado. */
  rota: '/estadias' | null;
}

/**
 * Menu inicial de modulos.
 *
 * Estruturado como lista de dados para crescer sem mexer no layout:
 * basta acrescentar um item.
 */
const MODULOS: Modulo[] = [
  { titulo: 'BGM Estadias', icone: '🏠', rota: '/estadias' },
  { titulo: 'BGM Banho/Tosa', icone: '💧', rota: null },
];

export default function TelaModulos() {
  const router = useRouter();
  const { usuario, sair } = useSessao();

  return (
    <SafeAreaView style={s.tela} edges={['top', 'left', 'right']}>
      <View style={s.cabecalho}>
        <Text style={s.tituloCabecalho}>BGM Gestão Interna</Text>
        <Pressable onPress={() => void sair()} hitSlop={12}>
          <Text style={s.sair}>Sair</Text>
        </Pressable>
      </View>

      {emMemoria ? (
        <View style={s.aviso}>
          <Text style={s.avisoTexto}>
            Modo demonstração — dados de exemplo, nada é salvo de verdade.
          </Text>
        </View>
      ) : null}

      {usuario ? <Text style={s.saudacao}>Olá, {usuario.email}</Text> : null}

      <View style={s.grade}>
        {MODULOS.map((m) => {
          const ativo = m.rota !== null;
          return (
            <Pressable
              key={m.titulo}
              style={s.itemGrade}
              onPress={() =>
                m.rota
                  ? router.push(m.rota)
                  : Alert.alert(
                      m.titulo,
                      'Este módulo estará disponível em uma próxima fase.',
                    )
              }
            >
              <View style={[s.cartao, !ativo && s.cartaoInativo]}>
                <Text style={[s.icone, !ativo && s.iconeInativo]}>
                  {m.icone}
                </Text>
                {!ativo ? <Text style={s.emBreve}>em breve</Text> : null}
              </View>
              <Text style={[s.rotulo, !ativo && s.rotuloInativo]}>
                {m.titulo}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.branco },
  cabecalho: {
    backgroundColor: cores.primaria,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloCabecalho: { color: cores.branco, fontSize: 20, fontWeight: '600' },
  sair: { color: cores.branco, fontSize: 14, fontWeight: '600' },
  saudacao: {
    color: cores.textoSuave,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.lg,
  },
  aviso: {
    backgroundColor: cores.acentoTenue,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
  },
  avisoTexto: { fontSize: 12, color: cores.primariaEscura, fontWeight: '600' },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: espaco.lg,
    gap: espaco.md,
  },
  // O Pressable envolve icone e rotulo: tocar no texto tambem navega.
  itemGrade: { width: '47%' },
  cartao: {
    backgroundColor: cores.primaria,
    borderRadius: raio.lg,
    aspectRatio: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaoInativo: { opacity: 0.45 },
  icone: { fontSize: 44 },
  iconeInativo: { opacity: 0.6 },
  emBreve: {
    position: 'absolute',
    top: espaco.sm,
    right: espaco.sm,
    color: cores.branco,
    fontSize: 11,
    fontWeight: '600',
  },
  rotulo: {
    textAlign: 'center',
    marginTop: espaco.sm,
    fontSize: 14,
    fontWeight: '700',
    color: cores.textoEscuro,
  },
  rotuloInativo: { color: cores.textoSuave },
});
