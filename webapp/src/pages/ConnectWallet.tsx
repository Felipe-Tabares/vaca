import { useEffect, useState } from "react";
import { useOpenfort } from "../lib/openfort";
import { useTelegram } from "../lib/telegram";

export default function ConnectWallet() {
  const { isAuthenticated, isLoading, walletAddress, login, error: openfortError } = useOpenfort();
  const { telegramId, initData, closeWebApp, showMainButton } = useTelegram();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Function to save wallet to bot via API (with authentication)
  const saveWalletToBot = async () => {
    if (!telegramId || !walletAddress) return;

    setIsSaving(true);
    try {
      console.log("Saving wallet to bot API...", { telegramId, walletAddress });
      const response = await fetch("/api/connect-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          walletAddress,
          initData, // Include initData for authentication
        }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (data.success) {
        setSaved(true);
        // Close webapp after short delay
        setTimeout(() => closeWebApp(), 500);
      } else {
        setError(data.error || "Error al guardar la wallet");
      }
    } catch (err: any) {
      console.error("Error saving wallet:", err);
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Show openfort errors
  useEffect(() => {
    if (openfortError) {
      setError(openfortError);
    }
  }, [openfortError]);

  useEffect(() => {
    // If already authenticated, show the main button
    if (isAuthenticated && walletAddress && telegramId) {
      showMainButton("Guardar y volver", () => {
        saveWalletToBot();
      });
    }
  }, [isAuthenticated, walletAddress, telegramId]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      await login();
    } catch (err: any) {
      setError(err?.message || "Error al conectar. Intenta de nuevo.");
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            ¡Wallet Conectada!
          </h1>
          <p className="mb-4" style={{ color: '#6B7280' }}>Tu dirección:</p>
          <div className="rounded-lg p-3 mb-6 border" style={{ backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }}>
            <code className="text-sm break-all font-mono" style={{ color: '#111827' }}>
              {walletAddress}
            </code>
          </div>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
            {saved ? "¡Guardado! Cerrando..." : "Haz clic en el botón de abajo para guardar y volver al chat."}
          </p>
          <button
            onClick={saveWalletToBot}
            disabled={isSaving || saved}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-xl"
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Logo */}
        <div className="text-7xl mb-6">🐄</div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">La Vaquita</h1>
        <p className="text-gray-600 mb-8">
          Conecta tu wallet para empezar a juntar dinero con tus amigos.
        </p>

        {/* Features */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">🔐</span>
            <span className="text-sm text-gray-700">
              Sin seed phrases ni contraseñas
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">⛽</span>
            <span className="text-sm text-gray-700">
              Sin pagar gas (gasless)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">💵</span>
            <span className="text-sm text-gray-700">
              Usa USDC (stablecoin)
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-lg p-3 mb-4 text-sm text-left">
            {error}
          </div>
        )}

        {/* Connect button */}
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

        <p className="text-gray-400 text-xs mt-4">
          Powered by Openfort
        </p>
      </div>
    </div>
  );
}
