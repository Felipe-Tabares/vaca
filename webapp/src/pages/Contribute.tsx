import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useOpenfort } from "../lib/openfort";
import { useTelegram } from "../lib/telegram";

export default function Contribute() {
  const [searchParams] = useSearchParams();
  const { sendTransaction, getBalance, isLoading: openfortLoading, walletAddress } = useOpenfort();
  const { telegramId, initData, closeWebApp, showMainButton, hideMainButton } = useTelegram();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");

  // Get params from URL
  const amount = searchParams.get("amount") || "0";
  const vaquitaName = searchParams.get("vaquitaName") || "Vaquita";
  const contributionId = searchParams.get("contributionId");
  const poolWallet = searchParams.get("poolWallet");

  // Fetch balance on load
  useEffect(() => {
    const fetchBalance = async () => {
      const bal = await getBalance();
      setBalance(bal);
    };
    fetchBalance();
  }, [walletAddress]);

  useEffect(() => {
    if (!isComplete) {
      showMainButton("Confirmar Aporte", handleConfirm);
    }

    return () => {
      hideMainButton();
    };
  }, [isComplete]);

  const handleConfirm = async () => {
    if (!contributionId || !poolWallet) {
      setError("Datos de transacción incompletos");
      return;
    }

    // Validate pool wallet address
    if (!poolWallet || !/^0x[a-fA-F0-9]{40}$/.test(poolWallet)) {
      setError("Pool wallet inválida. La vaquita no tiene wallet configurada.");
      return;
    }

    // Check balance
    const numericBalance = parseFloat(balance);
    const numericAmount = parseFloat(amount);
    if (numericBalance < numericAmount) {
      setError(`Balance insuficiente. Tienes ${balance} USDC, necesitas ${amount} USDC.`);
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Execute USDC transaction via Openfort
      console.log(`Sending ${amount} USDC to pool wallet: ${poolWallet}`);
      const txHash = await sendTransaction(poolWallet, amount);
      console.log("Transaction hash:", txHash);

      // Confirm contribution via API (with on-chain verification)
      const response = await fetch("/api/confirm-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId,
          txHash,
          amount: parseFloat(amount),
          telegramId,
          initData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al confirmar aporte");
      }

      setIsComplete(true);

      // Show close button
      showMainButton("Volver al chat", () => {
        closeWebApp();
      });
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Error al procesar la transacción. Intenta de nuevo.");
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
          <div className="text-7xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            ¡Aporte Exitoso!
          </h1>
          <p className="mb-4" style={{ color: '#6B7280' }}>
            Tu contribución de ${amount} USDC ha sido enviada.
          </p>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Puedes cerrar esta ventana y volver al chat.
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
          <div className="text-5xl mb-4">💸</div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Confirmar Aporte</h1>
        </div>

        {/* Balance */}
        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <p className="text-sm" style={{ color: '#166534' }}>Tu balance disponible</p>
          <p className="text-xl font-bold" style={{ color: '#15803D' }}>${balance} USDC</p>
        </div>

        {/* Transaction Details */}
        <div className="rounded-2xl border p-6 mb-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Vaquita</p>
              <p className="font-semibold" style={{ color: '#111827' }}>
                🐄 {decodeURIComponent(vaquitaName)}
              </p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Monto a enviar</p>
              <p className="text-3xl font-bold" style={{ color: '#16A34A' }}>
                ${amount} USDC
              </p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Pool Wallet</p>
              <p className="font-mono text-sm break-all" style={{ color: '#4B5563' }}>
                {poolWallet || "No configurada"}
              </p>
            </div>

            <div className="border-t pt-4" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Gas</p>
              <p className="font-semibold" style={{ color: '#16A34A' }}>
                ⛽ Gratis (patrocinado)
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
            <p className="text-sm" style={{ color: '#6B7280' }}>Procesando transacción USDC...</p>
          </div>
        )}

        {/* Manual button (backup) */}
        {!isProcessing && (
          <button
            onClick={handleConfirm}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors mt-4"
            disabled={isProcessing}
          >
            Confirmar Aporte
          </button>
        )}
      </div>
    </div>
  );
}
