import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return `${PREFIX}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const [prefix, salt, storedKey] = hash.split(':');
    if (prefix !== PREFIX || !salt || !storedKey) {
        return false;
    }

    const storedBuffer = Buffer.from(storedKey, 'hex');
    const derivedKey = (await scrypt(password, salt, storedBuffer.length)) as Buffer;

    return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey);
}
