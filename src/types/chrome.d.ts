declare const chrome: {
  storage: {
    local: {
      get(
        keys: string | string[] | null,
        callback: (items: Record<string, unknown>) => void,
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
  };
  runtime: {
    lastError?: { message: string };
    sendMessage(message: Record<string, unknown>, callback?: (response: unknown) => void): void;
    onMessage: {
      addListener(
        callback: (
          message: Record<string, unknown>,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    };
  };
  tabs: {
    query(queryInfo: { active?: boolean; currentWindow?: boolean }, callback: (tabs: Array<{ id?: number }>) => void): void;
    sendMessage(tabId: number, message: Record<string, unknown>, callback?: (response: unknown) => void): void;
  };
  scripting: {
    executeScript(options: { target: { tabId: number }; files: string[] }, callback?: () => void): void;
  };
};
