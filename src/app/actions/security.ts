"use server";

import { createClient } from "@/lib/supabase/server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PIN_PATTERN = /^\d{4}$/;
const SCRYPT_PARAMS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 32,
};

function isValidPin(pin: string) {
  return PIN_PATTERN.test(pin);
}

function hashPin(pin: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(pin, salt, SCRYPT_PARAMS.keyLength, {
    cost: SCRYPT_PARAMS.cost,
    blockSize: SCRYPT_PARAMS.blockSize,
    parallelization: SCRYPT_PARAMS.parallelization,
  }).toString("base64url");

  return `scrypt$${SCRYPT_PARAMS.cost}$${SCRYPT_PARAMS.blockSize}$${SCRYPT_PARAMS.parallelization}$${salt}$${hash}`;
}

function verifyPin(pin: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, cost, blockSize, parallelization, salt, expectedHash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !expectedHash) {
    return false;
  }

  const actual = scryptSync(pin, salt, Buffer.from(expectedHash, "base64url").length, {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
  });
  const expected = Buffer.from(expectedHash, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function checkSecurityPin(pin: string) {
  if (!isValidPin(pin)) {
    return { success: false, error: "PIN incorrecto" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No se pudo validar el PIN." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("security_pin, security_pin_hash")
    .eq("user_id", user.id)
    .single();

  if (!profile) return { success: false, error: "No se pudo validar el PIN." };

  if (verifyPin(pin, profile.security_pin_hash)) {
    return { success: true };
  }

  if (!profile.security_pin_hash && profile.security_pin === pin) {
    await supabase
      .from("profiles")
      .update({ security_pin_hash: hashPin(pin) })
      .eq("user_id", user.id);

    return { success: true };
  }

  return { success: false, error: "PIN incorrecto" };
}

export async function setSecurityPin(pin: string) {
  if (!isValidPin(pin)) {
    return { success: false, error: "El PIN debe tener 4 digitos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No se pudo guardar el PIN." };

  const { error } = await supabase
    .from("profiles")
    .update({ security_pin_hash: hashPin(pin) })
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
