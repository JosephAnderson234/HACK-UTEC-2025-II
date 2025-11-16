import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserStore = {
    token: string | null;
    setToken: (token: string | null) => void;
};

export const useToken = create<UserStore>()(
    persist(
        (set) => ({
            token: null,
            setToken: (token) => set({ token }),
        }),
        {
            name: 'user-auth',
        }
    )
);