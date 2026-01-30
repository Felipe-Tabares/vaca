import { customAlphabet } from "nanoid";

// Generate readable codes without confusing characters (0, O, I, l)
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(alphabet, 6);

export function createVaquitaCode(): string {
  return generateCode();
}
