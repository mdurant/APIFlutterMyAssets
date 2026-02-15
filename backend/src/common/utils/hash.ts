import { createHash, randomBytes } from 'crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  const random = randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[random[i] % 10];
  }
  return otp;
}
