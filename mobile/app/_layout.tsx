import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Carregando } from '../src/components/estados';
import { useSessao } from '../src/features/auth/store';
import { cores } from '../src/theme/cores';

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/**
 * Guard de autenticacao: enquanto nao houver sessao, qualquer rota redireciona
 * para /login; com sessao, /login redireciona para a home.
 */
function Guard() {
  const { usuario, pronto, carregar } = useSessao();
  const segmentos = useSegments();
  const router = useRouter();
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!pronto || !montado) return;
    const naTelaDeLogin = segmentos[0] === 'login';

    if (!usuario && !naTelaDeLogin) {
      router.replace('/login');
    } else if (usuario && naTelaDeLogin) {
      router.replace('/');
    }
  }, [usuario, pronto, montado, segmentos, router]);

  if (!pronto) return <Carregando />;
  return <Slot />;
}

export default function LayoutRaiz() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: cores.branco }}>
      <SafeAreaProvider>
        <QueryClientProvider client={clienteQuery}>
          <StatusBar style="light" />
          <Guard />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
