export interface ElectronAPI {
  checkEnvironments: () => Promise<Array<{
    name: string;
    version: string | null;
    status: 'success' | 'error' | 'warning';
    message: string;
  }>>;
  openExternal?: (url: string) => Promise<void>;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
