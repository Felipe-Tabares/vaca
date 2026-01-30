import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useOpenfort } from "../lib/openfort";
import { useTelegram } from "../lib/telegram";

export default function Withdraw() {
  const [searchParams] = useSearchParams();
  const { walletAddress, isLoading: openfortLoading } = useOpenfort();
  const { telegramId, initData, closeWebApp, showMainButton, hideMainButton } = useTelegram();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get params from URL
  const amount = searchParams.get("amount") || "0";
  const vaquitaId = searchParams.get("vaquitaId");
  const poolWallet = searchParams.get("poolWallet");

  useEffect(() => {
    if (!isComplete) {
      showMainButton("Retirar Fondos", handleWithdraw);
    }

    return () => {
      hideMainButton();
    };
  }, [isComplete]);

  const handleWithdraw = async () => {
    if (!vaquitaId) {
      setError("ID de vaquita no encontrado");
      return;
    }

    if (!walletAddress) {
      setError("Wallet no conectada");
      return;
    }

    if (!poolWallet || !/^0x[a-fA-F0-9]{40}$/.test(poolWallet)) {
      setError("Pool wallet inválida");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Request withdrawal via secure API
      // The backend controls the pool wallet and will execute the transfer
      console.log(`Requesting withdrawal of ${amount} USDC to ${walletAddress}`);

      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaquitaId,
          telegramId,
          initData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el retiro");
      }

      console.log("Withdrawal initiated:", data);

      setIsComplete(true);

      // Show close button
      showMainButton("Volver al chat", () => {
        closeWebApp();
      });
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setError(err.message || "Error al procesar el retiro. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (openfortLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
          <p style={{ color: '#6B7280' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="text-center max-w-sm">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            ¡Retiro Exitoso!
          </h1>
          <p className="mb-4" style={{ color: '#6B7280' }}>
            Se han enviado ${amount} USDC a tu wallet.
          </p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            ¡Gracias por usar La Vaquita!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Retirar Fondos</h1>
          <p style={{ color: '#6B7280' }}>¡Meta alcanzada!</p>
        </div>

        {/* Withdrawal Details */}
        <div className="rounded-2xl p-6 text-white mb-6" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}>
          <p className="text-sm opacity-80 mb-1">Total a retirar</p>
          <p className="text-4xl font-bold mb-4">${amount} USDC</p>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <p className="text-xs opacity-80 mb-1">Se enviará a</p>
            <p className="text-sm font-mono truncate">
              {walletAddress || "Tu wallet"}
            </p>
          </div>
        </div>

        {/* Pool info */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#F3F4F6' }}>
          <p className="text-sm mb-1" style={{ color: '#6B7280' }}>Pool Wallet (origen)</p>
          <p className="font-mono text-xs break-all" style={{ color: '#4B5563' }}>
            {poolWallet || "No configurada"}
          </p>
        </div>

        {/* Info */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#FEF3C7' }}>
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold mb-1" style={{ color: '#92400E' }}>Importante</p>
              <p className="text-sm" style={{ color: '#A16207' }}>
                Esta acción cerrará la vaquita permanentemente y enviará todos
                los fondos a tu wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg p-3 mb-4 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto mb-2" />
            <p className="text-sm" style={{ color: '#6B7280' }}>Procesando retiro...</p>
          </div>
        )}

        {/* Manual button */}
        {!isProcessing && (
          <button
            onClick={handleWithdraw}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors mt-4"
            disabled={isProcessing}
          >
            Confirmar Retiro
          </button>
        )}
      </div>
    </div>
  );
}
