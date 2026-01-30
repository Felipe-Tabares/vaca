import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Telegram WebApp types
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setParams: (params: { text?: string; color?: string }) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  sendData: (data: string) => void;
  initData: string; // Raw initData string for authentication
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    start_param?: string;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  colorScheme: "light" | "dark";
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  user: TelegramWebApp["initDataUnsafe"]["user"] | null;
  telegramId: number | null;
  initData: string | null; // Raw initData for authentication
  sendDataToBot: (data: object) => void;
  closeWebApp: () => void;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp["initDataUnsafe"]["user"] | null>(null);
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      setUser(tg.initDataUnsafe.user || null);
      setInitData(tg.initData || null); // Store raw initData for auth
    }
  }, []);

  const sendDataToBot = (data: object) => {
    if (webApp) {
      webApp.sendData(JSON.stringify(data));
    }
  };

  const closeWebApp = () => {
    if (webApp) {
      webApp.close();
    }
  };

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp) {
      webApp.MainButton.setParams({ text });
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (webApp) {
      webApp.MainButton.hide();
    }
  };

  // Get telegramId from URL params if not in Telegram context (for development)
  // Support both regular URLs and HashRouter URLs (params after #)
  const getUrlParams = () => {
    // First try regular search params
    if (window.location.search) {
      return new URLSearchParams(window.location.search);
    }
    // For HashRouter, params are after #/path?params
    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    if (queryIndex !== -1) {
      return new URLSearchParams(hash.substring(queryIndex));
    }
    return new URLSearchParams();
  };

  const urlParams = getUrlParams();
  const telegramIdFromUrl = urlParams.get("telegramId");
  const telegramId = user?.id || (telegramIdFromUrl ? parseInt(telegramIdFromUrl) : null);

  return (
    <TelegramContext.Provider
      value={{
        webApp,
        user,
        telegramId,
        initData,
        sendDataToBot,
        closeWebApp,
        showMainButton,
        hideMainButton,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error("useTelegram must be used within TelegramProvider");
  }
  return context;
}
