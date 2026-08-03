// O AsyncStorage e um modulo nativo: sem mock, qualquer teste que importe a
// camada Supabase (que o usa para persistir a sessao) quebra ao carregar.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
