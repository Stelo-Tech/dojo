import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stelotech.lemmings',
  appName: 'Lemmings',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
    SplashScreen: {
      launchAutoHide: true,
      autoHideDuration: 1000,
      backgroundColor: '#000000',
    },
  },
};

export default config;
