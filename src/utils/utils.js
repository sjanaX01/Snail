// Handles individual input changes
import { generateMnemonic, mnemonicToSeed } from "bip39";
import { WalletAuthentication } from "./Authentication";

export const handleInputChange = (
  secretKeyArray,
  setSecretKeyArray,
  index,
  value
) => {
  const newArray = [...secretKeyArray];
  newArray[index] = value;
  setSecretKeyArray(newArray);
};

// Handles paste functionality
export const handlePaste = async (setSecretKeyArray) => {
  try {
    const text = await navigator.clipboard.readText();
    const words = text.split(" ");
    if (words.length === 12) {
      setSecretKeyArray(words);
    } else {
      alert("Clipboard text must contain exactly 12 words.");
    }
  } catch (error) {
    console.error("Failed to paste text:", error);
    alert("Could not access clipboard");
  }
};

// Handles the "Next" button click
// SECURITY: Never store seed phrase in plaintext localStorage
export const handleNext = (secretKeyArray, inputRefs) => {
  const filledArray = secretKeyArray.map((word, index) => {
    const trimmedValue = inputRefs.current[index]?.value.trim() || "";
    return trimmedValue;
  });

  if (filledArray.every((val) => val == "")) {
    alert("Please fill all input fields");
  }
  // Seed phrase is only stored encrypted via WalletContext.saveNewWallet()
};

// SECURITY: Seed phrase generation no longer writes to localStorage in plaintext.
// Use WalletContext.generateNewMnemonic() + saveNewWallet() instead.
export const generateSeedPhrase = (setSeedPhrase, setView) => {
  setView("seedPhrase");
  const phrase = generateMnemonic();
  const words = phrase.split(" ");
  setSeedPhrase(words);
  // REMOVED: localStorage.setItem("walletSeedPhrase", phrase);
  // Seed is only encrypted and stored via WalletContext.saveNewWallet()
};


