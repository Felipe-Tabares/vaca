import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTelegram } from "../lib/telegram";

const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

export default function Balance() {
  const [searchParams] = useSearchParams();
  const { closeWebApp } = useTelegram();
  const [balance, setBalance] = useState<string>("0.0000");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get wallet address from URL
  const walletAddress = searchParams.get("wallet");

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) {
        setError("No se proporcionó dirección de wallet");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching USDC balance for:", walletAddress);

        // Encode balanceOf call: function selector + padded address
        const functionSelector = "70a08231"; // balanceOf(address)
        const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0");
        const data = `0x${functionSelector}${paddedAddress}`;

        const response = await fetch(BASE_SEPOLIA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: USDC_CONTRACT,
                data: data,
              },
              "latest",
            ],
            id: 1,
          }),
        });

        const result = await response.json();
        console.log("RPC response:", result);

        if (result.result) {
          // USDC has 6 decimals
          const balanceWei = parseInt(result.result, 16);
          const balanceUsdc = balanceWei / 1_000_000;
          setBalance(balanceUsdc.toFixed(2));
          console.log("Balance:", balanceUsdc);
        } else {
          console.error("RPC error:", result.error);
          setError("Error al obtener balance");
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [walletAddress]);

  if (loading) {
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Balance Card */}
        <div className="rounded-2xl p-6 text-white mb-6" style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}>
          <p className="text-sm opacity-80 mb-1">Balance disponible</p>
          <p className="text-4xl font-bold mb-4">${balance} USDC</p>
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <p className="text-xs opacity-80 mb-1">Dirección</p>
            <p className="text-sm font-mono truncate">
              {walletAddress || "No proporcionada"}
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
            ¿Cómo obtener USDC de prueba?
          </h3>
          <ul className="text-sm space-y-2" style={{ color: '#4B5563' }}>
            <li className="flex items-start gap-2">
              <span>1.</span>
              <span>Ve a <strong>faucet.circle.com</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span>2.</span>
              <span>Selecciona <strong>Base Sepolia</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span>3.</span>
              <span>Pega tu dirección de wallet</span>
            </li>
          </ul>
        </div>

        {/* Close button */}
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
