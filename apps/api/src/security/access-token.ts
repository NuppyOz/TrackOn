import 'dotenv/config';
import { SignJWT } from 'jose';

const ACCESS_TOKEN_SECONDS = 15 * 60;

const secret =
    process.env.AUTH_ACCESS_TOKEN_SECRET;

if (!secret) {
    throw new Error(
        'Falta AUTH_ACCESS_TOKEN_SECRET en el entorno de la API',
    );
}

if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
        'AUTH_ACCESS_TOKEN_SECRET debe tener al menos 32 bytes.',
    );
}

const secretKey =
    new TextEncoder().encode(secret);

type AccessTokenInput = {
    usuarioId: number;
    sesionId: number;
    rol: string;
};

export async function createAccessToken(
    datos: AccessTokenInput,
): Promise<string> {
    return new SignJWT({
        sid: datos.sesionId,
        rol: datos.rol,
    })
        .setProtectedHeader({
            alg: 'HS256',
            typ: 'JWT',
        })
        .setSubject(
            datos.usuarioId.toString(),
        )
        .setIssuer('trackon-api')
        .setAudience('trackon-web')
        .setIssuedAt()
        .setExpirationTime(
            `${ACCESS_TOKEN_SECONDS}s`,
        )
        .sign(secretKey);
}

export {
    ACCESS_TOKEN_SECONDS,
};
