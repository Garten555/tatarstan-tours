/**
 * TOTP (RFC 6238) через otplib v13 — единая точка для 2FA в API.
 * Совместимость с Google Authenticator / Authy (base32-секрет, otpauth URI).
 */
import { generateSecret, generateURI, verifySync } from 'otplib';

/** Как speakeasy `window: 2` при period 30 с: ±2 временных шага */
const TOTP_EPOCH_TOLERANCE_SEC = 60;

export function generateTotpSecret(): string {
  return generateSecret();
}

/** otpauth:// URL для QR и deep link */
export function buildKeyUri(params: { accountEmail: string; issuer: string; secret: string }): string {
  return generateURI({
    issuer: params.issuer,
    label: params.accountEmail,
    secret: params.secret,
  });
}

export function verifyTotpToken(secret: string, token: string): boolean {
  const t = token.trim().replace(/\s/g, '');
  if (!t) return false;
  const result = verifySync({
    secret,
    token: t,
    epochTolerance: TOTP_EPOCH_TOLERANCE_SEC,
  });
  return result.valid === true;
}
