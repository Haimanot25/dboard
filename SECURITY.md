# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ |

## Reporting a Vulnerability

Please report security vulnerabilities to **dboard-issues@gmail.com**.

**Do NOT open public GitHub issues for security vulnerabilities.**

We will respond within 48 hours and aim to resolve critical issues within 7 days.

## Security Measures

- Database passwords encrypted with AES-256-GCM (authenticated encryption)
- Passwords hashed with PBKDF2 (600,000 iterations, SHA-512, random salt)
- Timing-safe password comparison via `crypto.timingSafeEqual`
- SSRF protection on all external database connections
- CSRF protection on all state-changing endpoints
- Rate limiting on authentication and sensitive operations
- API keys generated with `crypto.randomBytes(32)` (CSPRNG)
- Docker runs as non-root user with minimal Alpine base image
