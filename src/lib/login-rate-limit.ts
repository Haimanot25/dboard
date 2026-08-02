const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const ipAttempts = new Map<string, { count: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 30;
const LOCKOUT_MS = 15 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;

export function checkLoginRateLimit(identifier: string): { allowed: boolean; retryIn?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now > entry.lockedUntil) {
    if (entry && now > entry.lockedUntil) {
      loginAttempts.delete(identifier);
    }
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    const retryIn = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryIn };
  }

  return { allowed: true };
}

export function checkIpRateLimit(ip: string): { allowed: boolean; retryIn?: number } {
  const now = Date.now();
  const entry = ipAttempts.get(ip);

  if (!entry || now > entry.lockedUntil) {
    if (entry && now > entry.lockedUntil) {
      ipAttempts.delete(ip);
    }
    return { allowed: true };
  }

  if (entry.count >= MAX_IP_ATTEMPTS) {
    const retryIn = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryIn };
  }

  return { allowed: true };
}

export function recordIpLoginAttempt(ip: string, success: boolean): void {
  if (success) {
    ipAttempts.delete(ip);
    return;
  }

  const now = Date.now();
  const entry = ipAttempts.get(ip);

  if (!entry || now > entry.lockedUntil) {
    ipAttempts.set(ip, {
      count: 1,
      lockedUntil: now + WINDOW_MS,
    });
    return;
  }

  entry.count++;
  if (entry.count >= MAX_IP_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

export function recordLoginAttempt(identifier: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now > entry.lockedUntil) {
    loginAttempts.set(identifier, {
      count: 1,
      lockedUntil: now + WINDOW_MS,
    });
    return;
  }

  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const map of [loginAttempts, ipAttempts]) {
    for (const [key, entry] of Array.from(map.entries())) {
      if (now > entry.lockedUntil) map.delete(key);
    }
  }
}, 60000);
