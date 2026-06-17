"use client";

import { createContext, useContext } from "react";

export const ProfileContext = createContext<{ profile: any | null }>({ profile: null });

export function ProfileProvider({ children, initialProfile }: { children: React.ReactNode, initialProfile?: any }) {
  return (
    <ProfileContext.Provider value={{ profile: initialProfile || null }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
