'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Check, Plus } from 'lucide-react'

interface User {
    id: string
    username: string
}

interface SearchableUserSelectProps {
    users: User[]
    initialUserId?: string
    initialUserName?: string
    namePrefix?: string
}

export function SearchableUserSelect({ users, initialUserId, initialUserName, namePrefix = '' }: SearchableUserSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedUserId, setSelectedUserId] = useState(initialUserId || '')
    const [selectedUserName, setSelectedUserName] = useState(initialUserName || '')
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredSuggestions = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSelectUser = (user: User) => {
        // We assume 'users' prop contains both real users (with real IDs)
        // and suggested custom names (where ID might match username or have a custom flag)

        // Check if this 'user' is actually a real user or a custom one
        // For simplicity, we compare ID and username. If they match, it's likely a custom name.
        if (user.id === user.username) {
            setSelectedUserId('')
            setSelectedUserName(user.username)
        } else {
            setSelectedUserId(user.id)
            setSelectedUserName('')
        }
        setIsOpen(false)
        setSearchTerm('')
    }

    const handleSelectFreeText = () => {
        if (!searchTerm.trim()) return
        setSelectedUserId('')
        setSelectedUserName(searchTerm.trim())
        setIsOpen(false)
        setSearchTerm('')
    }

    const displayText = selectedUserId
        ? users.find(u => u.id === selectedUserId)?.username || 'Usuario'
        : selectedUserName || 'Sin asignar'

    return (
        <div className="relative" ref={containerRef}>
            <input type="hidden" name={`${namePrefix}assigneeId`} value={selectedUserId} />
            <input type="hidden" name={`${namePrefix}assigneeName`} value={selectedUserName} />
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
            >
                <span className={displayText !== 'Unassigned' ? 'text-zinc-900 dark:text-white text-sm' : 'text-zinc-500 text-sm'}>
                    {displayText}
                </span>
                <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-100 dark:border-zinc-800">
                            <Search size={14} className="text-zinc-400" />
                            <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && searchTerm.trim()) {
                                        e.preventDefault()
                                        handleSelectFreeText()
                                    }
                                }}
                                placeholder="Buscar o escribir nombre..."
                                className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                            />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        <div
                            onClick={() => { setSelectedUserId(''); setSelectedUserName(''); setIsOpen(false); setSearchTerm(''); }}
                            className={`px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${!selectedUserId && !selectedUserName ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}
                        >
                            Sin asignar
                        </div>

                        {searchTerm && !users.some(u => u.username.toLowerCase() === searchTerm.toLowerCase()) && (
                            <div
                                onClick={handleSelectFreeText}
                                className="px-3 py-2 rounded-md text-sm cursor-pointer text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
                            >
                                <Plus size={14} />
                                <span>Usar "{searchTerm}"</span>
                            </div>
                        )}

                        {filteredSuggestions.map(user => (
                            <div
                                key={user.id}
                                onClick={() => handleSelectUser(user)}
                                className={`px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${(selectedUserId === user.id || (user.id === user.username && selectedUserName === user.username)) ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}
                            >
                                <span>{user.username}</span>
                                {(selectedUserId === user.id || (user.id === user.username && selectedUserName === user.username)) && <Check size={14} className="text-indigo-500" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
