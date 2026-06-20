// Custodial-demo address derivation. For now an address is a deterministic
// function of the username (no keypair) — "sagi1" + a SHA-256 prefix. This is
// stable per user and makes the explorer look legit. The deferred chain layer
// (ledger.chain) replaces this with a real ed25519 keypair whose public key
// hashes to the address; the format is chosen so that swap is transparent.

import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import type { Address } from "./types.js";

const PREFIX = "sagi1";
const ADDR_HEX_LEN = 38; // 19 bytes of the digest

export function deriveAddress(username: string): Address {
  const digest = sha256(utf8ToBytes(username.trim()));
  return `${PREFIX}${bytesToHex(digest).slice(0, ADDR_HEX_LEN)}`;
}

export function isAddress(value: string): boolean {
  return new RegExp(`^${PREFIX}[0-9a-f]{${ADDR_HEX_LEN}}$`).test(value);
}
