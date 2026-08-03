import { Stack } from 'expo-router';

import { cores } from '../../src/theme/cores';

/**
 * As abas ficam dentro de `index.tsx` (componente proprio), e nao como
 * `Tabs` do router, porque os formularios sao rotas empilhadas sobre elas.
 */
export default function LayoutEstadias() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: cores.branco,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: cores.branco },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'BGM Estadias' }} />
      <Stack.Screen
        name="agendamento/novo"
        options={{ title: 'Novo agendamento' }}
      />
      <Stack.Screen
        name="agendamento/[id]"
        options={{ title: 'Editar agendamento' }}
      />
      <Stack.Screen name="animal/novo" options={{ title: 'Novo cliente' }} />
      <Stack.Screen name="animal/[id]/index" options={{ title: 'Ficha' }} />
      <Stack.Screen
        name="animal/[id]/editar"
        options={{ title: 'Editar cliente' }}
      />
    </Stack>
  );
}
