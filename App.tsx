import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/lib/queryClient';
import RootNavigator from './src/navigation/RootNavigator';
import AppUpdateModal from './src/components/common/AppUpdateModal';
import { useAppUpdateCheck } from './src/hooks/useAppUpdateCheck';
import { useOtaUpdateCheck } from './src/hooks/useOtaUpdateCheck';

function AppShell() {
  const { state, latestVersion, openStore } = useAppUpdateCheck();
  useOtaUpdateCheck();

  return (
    <>
      <RootNavigator />
      <AppUpdateModal state={state} latestVersion={latestVersion} onUpdate={openStore} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppShell />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
