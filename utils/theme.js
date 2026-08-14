import { useColorScheme } from 'react-native';

const light = {
  mode: 'light',
  background: '#ffffff',
  surface: '#f5f5f5',
  surfaceAlt: '#e8f5e9',
  card: '#f5f5f5',
  text: '#212121',
  textSecondary: '#757575',
  textMuted: '#9e9e9e',
  placeholderIcon: '#bdbdbd',
  border: '#e0e0e0',
  inputBorder: '#cccccc',
  iconMuted: '#616161',
  iconSubtle: '#666666',
  primary: '#2e7d32',
  onPrimary: '#ffffff',
  danger: '#c62828',
  dangerBg: '#fdecea',
  warning: '#f9a825',
  statusBarStyle: 'dark',
};

const dark = {
  mode: 'dark',
  background: '#121212',
  surface: '#1e1e1e',
  surfaceAlt: '#1b3320',
  card: '#1e1e1e',
  text: '#f0f0f0',
  textSecondary: '#b0b0b0',
  textMuted: '#8a8a8a',
  placeholderIcon: '#5c5c5c',
  border: '#2c2c2c',
  inputBorder: '#3a3a3a',
  iconMuted: '#b0b0b0',
  iconSubtle: '#b0b0b0',
  primary: '#4caf50',
  onPrimary: '#0d1f0f',
  danger: '#ef5350',
  dangerBg: '#3b1f1f',
  warning: '#ffb74d',
  statusBarStyle: 'light',
};

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
