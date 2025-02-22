import { createContext } from 'react';
import { User } from 'firebase/auth';
import { UserClaims, ActionType, ResourceType } from './types';

interface AuthContextType {
  user: User | null;
  claims: UserClaims | null;
  loading: boolean;
  refreshClaims: () => Promise<void>;
  setContext: React.Dispatch<React.SetStateAction<{
    user: User | null;
    claims: UserClaims | null;
    loading: boolean;
    role: string;
    settings: any;
  }>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
