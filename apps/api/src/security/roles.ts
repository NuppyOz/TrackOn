export const ROLE_CODES = {
    ADMIN: 'ADMIN',
    GTE_OPE: 'GTE_OPE',
    TEC: 'TEC',
} as const;

export type RoleCode =
    typeof ROLE_CODES[keyof typeof ROLE_CODES];