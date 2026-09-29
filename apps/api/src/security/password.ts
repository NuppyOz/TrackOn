import { randomBytes, scrypt } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 32 * 1024 * 1024;

function deriveKey(
    password: string,
    salt: Buffer,
): Promise<Buffer> {
    return new Promise ((resolve, reject) => {
        scrypt(
            password,
            salt,
            KEY_LENGTH,
            {
                cost: COST,
                blockSize: BLOCK_SIZE,
                parallelization: PARALLELIZATION,
                maxmem: MAX_MEMORY,
            },
            (error, deriveKey) => {
                if (error) {
                    reject (error);
                    return;
                }

                resolve(deriveKey);
            },
        );
    });
}

export async function hashPassword(
    password:string
): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await deriveKey(password, salt);

    return [
        'scrypt',
        COST,
        BLOCK_SIZE,
        PARALLELIZATION,
        salt.toString('base64url'),
        derivedKey.toString('base64url'),
    ].join('$');
    
}