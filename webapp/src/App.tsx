import { Routes, Route } from "react-router-dom";
import { OpenfortProvider } from "./lib/openfort";
import { TelegramProvider } from "./lib/telegram";
import ConnectWallet from "./pages/ConnectWallet";
import Balance from "./pages/Balance";
import Contribute from "./pages/Contribute";
import Withdraw from "./pages/Withdraw";

function App() {
  return (
    <TelegramProvider>
      <OpenfortProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<ConnectWallet />} />
            <Route path="/balance" element={<Balance />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/withdraw" element={<Withdraw />} />
          </Routes>
        </div>
      </OpenfortProvider>
    </TelegramProvider>
  );
}

export default App;
