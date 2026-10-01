import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

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

export async function verifyPassword (
    password: string,
    storedHash: string
): Promise<boolean> {
    const parts = storedHash.split('$');

    if (parts.length !== 6){
        return false;
    }

    const [
        algorithm,
        costText,
        blockSizeText,
        parallelizationText,
        saltText,
        hashText,
    ] = parts;

    if (algorithm !== 'scrypt') {
        return false;
    }

    const cost = Number(costText)
    const blockSize = Number(blockSizeText)
    const parallelization = Number(parallelizationText)

    if (
        !Number.isInteger(cost) ||
        !Number.isInteger(blockSize) ||
        !Number.isInteger(parallelization)
    ) {
        return false
    }

    try {
        const salt = Buffer.from(
            saltText, 'base64url'
        )

        const expectedHash = Buffer.from(
            hashText, 'base64url'
        )

        const actualHash = await new Promise <Buffer>(
            (resolve, reject) => {
                scrypt(
                    password,
                    salt,
                    expectedHash.length,
                    {
                        cost, blockSize, parallelization, maxmem: MAX_MEMORY
                    },
                    (error, derivedKey) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(derivedKey)
                    },
                );
            },
        );
        
        if ( actualHash.length !== expectedHash.length) {
            return false
        }

        return timingSafeEqual(
            actualHash, expectedHash
        );
    } catch {
        return false
    }

}