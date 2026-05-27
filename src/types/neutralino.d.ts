/**
 * Type declaration for Neutralinojs native API (window.Neutralino).
 * Covers the subset used by this application.
 */

interface NeutralinoFileFilter {
  name: string;
  extensions: string[];
}

interface NeutralinoOpenDialogResult {
  files?: Array<{ path: string; name: string; type: string }>;
}

interface NeutralinoSaveDialogResult {
  file?: string;
}

declare namespace Neutralino {
  namespace app {
    function broadcast(event: string, data: string): void;
  }

  namespace os {
    function showOpenDialog(
      title: string,
      options?: { filters?: NeutralinoFileFilter[]; multiSelections?: boolean },
    ): Promise<string[]>;

    function showSaveDialog(
      title: string,
      options?: { defaultPath?: string; filters?: NeutralinoFileFilter[] },
    ): Promise<string>;
  }

  namespace filesystem {
    function readBinaryFile(path: string): Promise<ArrayBuffer>;
    function writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
    function readFile(path: string): Promise<string>;
    function writeFile(path: string, data: string): Promise<void>;
  }

  namespace storage {
    function setData(key: string, value: string): Promise<void>;
    function getData(key: string): Promise<string | null>;
  }

  namespace events {
    function on(event: string, callback: (evt?: any) => void): void;
    function off(event: string, callback: (evt?: any) => void): void;
    function dispatch(event: string, data?: any): void;
  }

  function init(): void;
}

declare const NL_APPID: string;
declare const NL_PORT: string;
declare const NL_TOKEN: string;
