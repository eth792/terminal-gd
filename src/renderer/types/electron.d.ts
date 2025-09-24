export interface ElectronAPI {
  checkEnvironments: () => Promise<Array<{
    name: string;
    version: string | null;
    status: 'success' | 'error' | 'warning';
    message: string;
  }>>;
  openExternal?: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
