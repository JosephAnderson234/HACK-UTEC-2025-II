import type { DataAuthority, DataStudent, UserResponse } from '@/interfaces/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserStore = {
    token: string | null;
    user: UserResponse & { data_student?: DataStudent } & {data_authority?: DataAuthority};
    setUser: (user: UserResponse & { data_student?: DataStudent } & {data_authority?: DataAuthority}) => void;
    setToken: (token: string | null) => void;
};

export const useToken = create<UserStore>()(
    persist(
        (set) => ({
            token: null,
            user: {} as UserResponse & { data_student?: DataStudent } & {data_authority?: DataAuthority},
            setToken: (token) => set({ token }),
            setUser: (user) => set({ user }),
        }),
        {
            name: 'user-auth',
        }
    )
);