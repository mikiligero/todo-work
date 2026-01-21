'use server'

import prisma from '@/lib/prisma'
import { createSession, deleteSession, hashPassword, verifyPassword } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'


export async function checkAnyUserExists() {
    const count = await prisma.user.count()
    return count > 0
}

export async function createFirstUser(formData: FormData) {
    console.log('--- createFirstUser start ---')
    const count = await prisma.user.count()
    if (count > 0) {
        console.log('Admin already exists')
        return { error: 'Admin user already exists' }
    }

    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
        return { error: 'Username and password are required' }
    }

    console.log('Hashing password...')
    const hashedPassword = await hashPassword(password)

    try {
        console.log('Creating user in DB...')
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                isAdmin: true,
            },
        })
        console.log('User created:', user.id)
        console.log('Creating session...')
        await createSession(user.id)
        console.log('Session created')
    } catch (e) {
        console.error('Error creating user:', e)
        return { error: 'Failed to create user' }
    }

    console.log('Redirecting to / ...')
    redirect('/')
}

export async function login(formData: FormData) {
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    if (!username || !password) {
        return { error: 'Username and password are required' }
    }

    const user = await prisma.user.findUnique({
        where: { username },
    })

    if (!user || !(await verifyPassword(password, user.password))) {
        return { error: 'Invalid username or password' }
    }

    await createSession(user.id)
    redirect('/')
}

export async function logout() {
    await deleteSession()
    redirect('/login')
}
