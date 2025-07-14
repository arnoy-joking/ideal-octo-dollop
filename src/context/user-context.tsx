'use client';
import type { User } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface UserContextType {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    isInitialLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children, initialUsers }: { children: ReactNode; initialUsers: User[] }) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [currentUser, setCurrentUserInternal] = useState<User | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        try {
            const lastUserId = localStorage.getItem('currentUser');
            if (lastUserId) {
                const user = users.find(u => u.id === lastUserId);
                setCurrentUserInternal(user || null);
            }
        } catch (error) {
            console.warn("Could not access localStorage to get current user.");
            setCurrentUserInternal(null)
        } finally {
            setIsInitialLoading(false);
        }
    }, [users]);
    
    const setCurrentUser = (user: User | null) => {
        setCurrentUserInternal(user);
        try {
            if (user) {
                localStorage.setItem('currentUser', user.id);
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
             console.warn("Could not access localStorage to set current user.");
        }
    };

    const value = { currentUser, setCurrentUser, users, setUsers, isInitialLoading };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
