import {
    createHash,
    randomBytes,
} from 'node:crypto';

export const REFRESH_TOKEN_DAYS = 7;

export function generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(
    token: string,
): string {
    return createHash('sha256')
        .update(token)
        .digest('hex');
}

export function calculateRefreshExpiration(): Date {
    const expiration = new Date();

    expiration.setDate(
        expiration.getDate() + REFRESH_TOKEN_DAYS,
    );

    return expiration;
}