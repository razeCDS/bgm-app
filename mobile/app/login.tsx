import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErroAutenticacao } from '../src/features/auth/repositorio';
import { useSessao } from '../src/features/auth/store';
import { cores } from '../src/theme/cores';
import { espaco, estilos, raio } from '../src/theme/estilos';

export default function TelaLogin() {
  const entrar = useSessao((s) => s.entrar);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function submeter() {
    setErro(null);
    if (!email.includes('@')) return setErro('Informe um e-mail válido.');
    if (senha.length < 4) return setErro('A senha deve ter ao menos 4 caracteres.');

    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
      // O redirecionamento e feito pelo guard no layout raiz.
    } catch (e) {
      setErro(
        e instanceof ErroAutenticacao
          ? e.message
          : 'Não foi possível entrar. Tente novamente.',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={s.tela}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        <ScrollView contentContainerStyle={s.conteudo}>
          <View style={s.logo}>
            <Text style={s.logoIcone}>🐾</Text>
          </View>
          <Text style={s.titulo}>BGM Daycare</Text>
          <Text style={s.subtitulo}>Gestão interna</Text>

          <View style={s.cartao}>
            <Text style={estilos.rotuloCampo}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="voce@email.com"
              placeholderTextColor={cores.textoSuave}
              style={[estilos.campo, s.campo]}
            />

            <Text style={estilos.rotuloCampo}>Senha</Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={cores.textoSuave}
              style={[estilos.campo, s.campo]}
              onSubmitEditing={submeter}
            />

            {erro ? (
              <View style={s.erro}>
                <Text style={s.erroTexto}>{erro}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={submeter}
              disabled={carregando}
              style={[estilos.botaoPrimario, carregando && estilos.desabilitado]}
            >
              {carregando ? (
                <ActivityIndicator color={cores.branco} />
              ) : (
                <Text style={estilos.botaoPrimarioTexto}>Entrar</Text>
              )}
            </Pressable>
          </View>

          <Text style={s.rodape}>Acesso restrito à equipe.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.primaria },
  flex: { flex: 1 },
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espaco.xxl,
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: cores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcone: { fontSize: 40 },
  titulo: {
    color: cores.branco,
    fontSize: 26,
    fontWeight: '700',
    marginTop: espaco.xl,
  },
  subtitulo: { color: cores.brancoSuave, fontSize: 15, marginTop: espaco.xs },
  cartao: {
    backgroundColor: cores.branco,
    borderRadius: raio.lg,
    padding: espaco.xl,
    width: '100%',
    maxWidth: 420,
    marginTop: espaco.xxl + 8,
  },
  campo: { marginBottom: espaco.md + 2 },
  erro: {
    backgroundColor: cores.erroTenue,
    borderRadius: raio.sm,
    padding: espaco.md,
    marginBottom: espaco.md,
  },
  erroTexto: { color: cores.erro, fontSize: 13 },
  rodape: { color: cores.brancoTenue, fontSize: 13, marginTop: espaco.lg },
});
