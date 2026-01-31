import { useEffect, useState } from "react";
import { useOpenfort } from "../lib/openfort";
import { useTelegram } from "../lib/telegram";

const BOT_API_URL = import.meta.env.VITE_BOT_API_URL || "";

export default function ConnectWallet() {
  const { isAuthenticated, isLoading, walletAddress, login, logout, error: openfortError } = useOpenfort();
  const { telegramId, initData, closeWebApp } = useTelegram();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasCleared, setHasCleared] = useState(false);

  // Clear cached sessions on mount to ensure fresh wallet creation
  useEffect(() => {
    const clearSessions = async () => {
      if (hasCleared) return;
      console.log("=== ConnectWallet: Clearing cached sessions ===");

      // Clear all Openfort and vaquita related localStorage
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.includes('openfort') || key.includes('shield') || key.includes('vaquita')
      );
      keysToRemove.forEach(key => {
        console.log("Removing localStorage key:", key);
        localStorage.removeItem(key);
      });

      // Force logout from Openfort if authenticated
      if (isAuthenticated) {
        console.log("Force logging out existing session...");
        try {
          await logout();
          console.log("Logout successful");
        } catch (e) {
          console.log("Logout error:", e);
        }
      }

      setHasCleared(true);
    };

    if (!isLoading) {
      clearSessions();
    }
  }, [isLoading, isAuthenticated, hasCleared, logout]);

  // Debug on mount
  useEffect(() => {
    console.log("=== ConnectWallet Debug ===");
    console.log("BOT_API_URL:", BOT_API_URL);
    console.log("telegramId:", telegramId);
    console.log("walletAddress:", walletAddress);
    console.log("window.Telegram:", window.Telegram);
    console.log("initData:", initData ? "present" : "missing");
  }, [telegramId, walletAddress, initData]);

  // Show openfort errors
  useEffect(() => {
    if (openfortError) {
      setError(openfortError);
    }
  }, [openfortError]);

  // Function to save wallet to bot via API
  const saveWalletToBot = async () => {
    console.log("=== saveWalletToBot called ===");
    console.log("telegramId:", telegramId);
    console.log("walletAddress:", walletAddress);
    console.log("BOT_API_URL:", BOT_API_URL);

    setError(null);

    // Validation with user-visible errors
    if (!BOT_API_URL) {
      const msg = "Error de configuración: API no disponible. Contacta al administrador.";
      console.error(msg);
      setError(msg);
      return;
    }

    if (!telegramId) {
      const msg = "No se pudo identificar tu cuenta de Telegram. Cierra esta ventana y vuelve a abrir desde el bot.";
      console.error(msg);
      setError(msg);
      return;
    }

    if (!walletAddress) {
      const msg = "Wallet no conectada. Recarga la página.";
      console.error(msg);
      setError(msg);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = `${BOT_API_URL}/api/connect-wallet`;
      console.log("Fetching:", url);

      // Get the openfortUserId that was used to create the wallet
      const openfortUserId = localStorage.getItem("vaquita_user_id");
      console.log("openfortUserId from localStorage:", openfortUserId);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          walletAddress,
          openfortUserId: openfortUserId ? parseInt(openfortUserId) : telegramId,
          initData,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      console.log("API response:", data);

      if (data.success) {
        setSaved(true);
        // Close webapp after short delay
        setTimeout(() => {
          console.log("Closing webapp...");
          closeWebApp();
        }, 800);
      } else {
        throw new Error(data.error || "Error al guardar");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      // Check if it's a CORS or network error
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        setError("Error de conexión. Verifica tu internet o intenta de nuevo.");
      } else {
        setError(err.message || "Error desconocido. Intenta de nuevo.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      // Clear any old cached session first
      localStorage.removeItem("vaquita_user_id");
      // IMPORTANT: Pass telegramId to create wallet tied to this user
      console.log("Connecting with telegramId:", telegramId);
      await login(telegramId || undefined);
    } catch (err: any) {
      setError(err?.message || "Error al conectar. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Wallet connected - show save button
  if (isAuthenticated && walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            ¡Wallet Conectada!
          </h1>

          <p className="mb-4" style={{ color: '#6B7280' }}>Tu dirección:</p>

          <div className="rounded-lg p-3 mb-4 border" style={{ backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }}>
            <code className="text-xs break-all font-mono" style={{ color: '#111827' }}>
              {walletAddress}
            </code>
          </div>

          {/* ERROR DISPLAY - THIS WAS MISSING! */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm text-left">
              ⚠️ {error}
            </div>
          )}

          {/* Debug info in dev */}
          {!telegramId && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg p-3 mb-4 text-sm">
              ⚠️ ID de Telegram no detectado. Asegúrate de abrir esto desde el bot.
            </div>
          )}

          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            {saved
              ? "¡Guardado! Cerrando..."
              : "Presiona el botón para guardar y volver al chat."
            }
          </p>

          <button
            onClick={saveWalletToBot}
            disabled={isSaving || saved}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Guardando...
              </span>
            ) : saved ? (
              "✅ ¡Guardado!"
            ) : (
              "💾 Guardar y volver al chat"
            )}
          </button>

          {/* Manual close button as fallback */}
          {saved && (
            <button
              onClick={() => closeWebApp()}
              className="w-full mt-3 text-gray-500 underline text-sm"
            >
              Cerrar manualmente
            </button>
          )}
        </div>
      </div>
    );
  }

  // Initial state - show connect button
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-6">🐄</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">La Vaquita</h1>
        <p className="text-gray-600 mb-8">
          Conecta tu wallet para empezar a juntar dinero con tus amigos.
        </p>

        <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🔐</span>
            <span className="text-sm text-gray-700">Sin seed phrases ni contraseñas</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">⛽</span>
            <span className="text-sm text-gray-700">Sin pagar gas (gasless)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">💵</span>
            <span className="text-sm text-gray-700">Usa USDC (stablecoin)</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm text-left">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          {isConnecting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Conectando...
            </span>
          ) : (
            "🔗 Conectar Wallet"
          )}
        </button>

        <p className="text-gray-400 text-xs mt-4">Powered by Openfort</p>
      </div>
    </div>
  );
}
