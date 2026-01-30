import { useEffect, useState } from "react";
import { useOpenfort } from "../lib/openfort";
import { useTelegram } from "../lib/telegram";

export default function Balance() {
  const { walletAddress, getBalance, isLoading } = useOpenfort();
  const { closeWebApp, showMainButton } = useTelegram();
  const [balance, setBalance] = useState<string>("0.0000");
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const bal = await getBalance();
        setBalance(bal);
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [getBalance, walletAddress]);

  useEffect(() => {
    showMainButton("Cerrar", () => {
      closeWebApp();
    });
  }, []);

  if (isLoading || loadingBalance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
          <p style={{ color: '#6B7280' }}>Cargando balance USDC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">💰</div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Tu Balance</h1>
        </div>

        {/* Balance Card */}
        <div className="rounded-2xl p-6 text-white mb-6" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}>
          <p className="text-sm opacity-80 mb-1">Balance disponible</p>
          <p className="text-4xl font-bold mb-4">${balance} USDC</p>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <p className="text-xs opacity-80 mb-1">Dirección</p>
            <p className="text-sm font-mono truncate">
              {walletAddress || "No conectada"}
            </p>
          </div>
        </div>

        {/* Network info */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            <div>
              <p className="font-semibold" style={{ color: '#1E40AF' }}>Red: Base Sepolia (Testnet)</p>
              <p className="text-xs" style={{ color: '#3B82F6' }}>USDC Contract: 0x036C...3dCF7e</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl p-4" style={{ backgroundColor: '#F3F4F6' }}>
          <h3 className="font-semibold mb-2" style={{ color: '#111827' }}>
            ¿Cómo obtener USDC?
          </h3>
          <ul className="text-sm space-y-2" style={{ color: '#4B5563' }}>
            <li className="flex items-start gap-2">
              <span>1.</span>
              <span>Compra USDC en un exchange (Binance, Coinbase)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>2.</span>
              <span>Envía a tu dirección de wallet en Base network</span>
            </li>
            <li className="flex items-start gap-2">
              <span>3.</span>
              <span>¡Listo para usar en La Vaquita!</span>
            </li>
          </ul>
        </div>

        {/* Manual close button */}
        <button
          onClick={() => closeWebApp()}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors mt-6"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
