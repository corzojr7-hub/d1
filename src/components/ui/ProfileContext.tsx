"use client";

import { createContext, useContext } from "react";
import type { BasicTaskConfig, Profile, StoreAssistant } from "@/lib/domain/types";

type NormalizedProfile = Omit<Profile, "assistants" | "areas" | "basic_tasks"> & {
  assistants: StoreAssistant[];
  areas: string[];
  basic_tasks: BasicTaskConfig[];
};

export const ProfileContext = createContext<{ profile: NormalizedProfile | null }>({ profile: null });

function normalizeProfile(initialProfile: Profile | null | undefined): NormalizedProfile | null {
  if (!initialProfile) return null;

  return {
    ...initialProfile,
    assistants: Array.isArray(initialProfile.assistants) ? initialProfile.assistants : [],
    areas: Array.isArray(initialProfile.areas) ? initialProfile.areas : [],
    basic_tasks: Array.isArray(initialProfile.basic_tasks) ? initialProfile.basic_tasks : [],
  } as NormalizedProfile;
}

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode;
  initialProfile?: Profile | null;
}) {
  return (
    <ProfileContext.Provider value={{ profile: normalizeProfile(initialProfile) }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
