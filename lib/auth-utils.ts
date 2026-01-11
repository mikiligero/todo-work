import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const SECRET_KEY = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'default-secret-key-change-it'
const key = new TextEncoder().encode(SECRET_KEY)

export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
}

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // 7 days session
        .sign(key)
}

export async function decrypt(input: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        })
        return payload
    } catch (error) {
        return null
    }
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null
    return await decrypt(session)
}

export async function createSession(userId: string) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, expires })

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        // Disable secure in production if we are not using HTTPS (common in local LXC/Proxmox)
        // You can enable it by setting REQUIRE_SECURE_AUTH=true in .env
        secure: process.env.REQUIRE_SECURE_AUTH === 'true',
        expires,
        sameSite: 'lax',
        path: '/',
    })
}

export async function deleteSession() {
    ; (await cookies()).delete('session')
}
