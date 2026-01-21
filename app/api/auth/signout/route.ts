import { deleteSession } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    await deleteSession()
    redirect('/login')
}
