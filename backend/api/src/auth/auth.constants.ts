export const AUTH_COOKIE_NAME = 'jano_access_token';
export const AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const AUTH_COOKIE_MAX_AGE_MS = AUTH_TOKEN_TTL_SECONDS * 1000;

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only considers the first 72 bytes; keeping the input bounded avoids silent truncation.
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
