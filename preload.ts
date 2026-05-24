import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  openFile: (filters: { name: string; extensions: string[] }[]) => Promise<{ path: string; name: string; buffer: ArrayBuffer } | null>;
  saveFile: (options: { defaultName: string; filters: { name: string; extensions: string[] }[]; data: Buffer }) => Promise<boolean>;
  saveData: (key: string, value: string) => Promise<boolean>;
  loadData: (key: string) => Promise<string | null>;
  onMenuImport: (callback: () => void) => void;
  onMenuExport: (callback: () => void) => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filters: any) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (options: any) => ipcRenderer.invoke('dialog:saveFile', options),
  saveData: (key: string, value: string) => ipcRenderer.invoke('storage:set', key, value),
  loadData: (key: string) => ipcRenderer.invoke('storage:get', key),
  onMenuImport: (callback: () => void) => {
    ipcRenderer.on('menu:import', callback);
  },
  onMenuExport: (callback: () => void) => {
    ipcRenderer.on('menu:export', callback);
  },
} satisfies ElectronAPI);
