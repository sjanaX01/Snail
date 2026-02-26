import {
    clusterApiUrl,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
  } from "@solana/web3.js";
   
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = new PublicKey("nicktrLHhYzLmoVbuZQzHUTicd2sfP571orwo9jfc8c");
   
  const balance = await connection.getBalance(wallet);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);