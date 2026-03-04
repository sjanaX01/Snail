import { useEffect, useState } from "react";
// import CryptoWallet from "../../utils/createWallet.js";
import { deriveSolanaKeypair } from "../../services/svm/util.js";
import { deriveEthereumWallet } from "../../services/evm/util.js";
import { mnemonicToSeed } from "bip39";

function WalletCard({ walletIndex }) {
  const WALLET_TYPES = {
    EVM: "Ethereum",
    SOL: "Solana",
    TON: "TON",
  };
  const TABS = [
    { id: "ETH", label: WALLET_TYPES.EVM },
    { id: "SOL", label: WALLET_TYPES.SOL },
    { id: "TON", label: WALLET_TYPES.TON },
  ];
  const SolPath = `m/44'/501'/${walletIndex}'/0'`;
  const EthPath = `m/44'/60'/0'/0/${walletIndex}`;
  // SECURITY: Never read plaintext mnemonic from localStorage.
  // This legacy component should use WalletContext instead.
  const mnemonic = null; // DEPRECATED: was localStorage.getItem("walletSeedPhrase");

  const [activeToken, setActiveToken] = useState("ETH");
  const [wallet, setWallet] = useState({
    sol: { publicKey: "", privateKey: "" },
    eth: { publicKey: "", privateKey: "" },
  });

  useEffect(() => {
    async function generateWalletKeys() {
      try {
        if (!mnemonic) throw new Error("Mnemonic not found in localStorage");

        const seed = await mnemonicToSeed(mnemonic);

        // Solana keys

        const solKeypair = deriveSolanaKeypair(seed, SolPath);
        const solKeys = {
          publicKey: solKeypair.publicKey.toBase58(),
          privateKey: Buffer.from(solKeypair.secretKey).toString("hex"),
        };

        // Ethereum keys
        const ethKeypair = deriveEthereumWallet(seed, EthPath);
        const ethKeys = {
          publicKey: ethKeypair.address,
          privateKey: ethKeypair.privateKey,
        };

        // Update wallet state
        setWallet({
          sol: solKeys,
          eth: ethKeys,
        });
      } catch (error) {
        console.error("Error generating wallet keys:", error);
      }
    }

    generateWalletKeys();
  }, [mnemonic, SolPath, EthPath]);

  return (
    <div className="box h-auto min-h-[18rem] w-auto border-2 rounded-lg p-6 mb-4 shadow-sm">
      <h2 className="font-semibold mb-4">Wallet {walletIndex ?? 0}</h2>

      <div className="flex gap-2 border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`font-medium text-sm px-4 py-2 rounded-md transition-colors mb-9 ${
              activeToken === tab.id
                ? "bg-gray-200 text-gray-800"
                : "bg-gray-100 hover:bg-gray-150"
            }`}
            onClick={() => setActiveToken(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full h-auto min-h-[7rem] bg-gray-100 rounded-md flex py-5 justify-center">
        <div className="publickey w-1/2 px-6">
          <h3 className="font-semibold text-sm mb-4">Public Key</h3>
          <div className="text-[12px] break-all">
            {activeToken === "SOL" && wallet.sol.publicKey}
            {activeToken === "ETH" && wallet.eth.publicKey}
          </div>
        </div>
        <div className="h-full w-2 bg-gray-300 rounded-lg"></div>
        <div className="privatekey w-1/2 px-6">
          <h3 className="font-semibold text-sm mb-4">Private Key</h3>
          <div className="text-[12px] break-all">
            {activeToken === "SOL" && wallet.sol.privateKey}
            {activeToken === "ETH" && wallet.eth.privateKey}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletCard;
