import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentLog {
  step: string;
  msg: string;
  time: number;
}

interface AgentStore {
  userId: string;
  logs: AgentLog[];
  addLog: (step: string, msg: string) => void;
  clearLogs: () => void;
}

// Generate userId once on first load, persist it
const getOrCreateUserId = () => {
  if (typeof window === 'undefined') return `user_${Date.now()}`;
  const stored = localStorage.getItem('composio-user-id');
  if (stored) return stored;
  const newId = `user_${Date.now()}`;
  localStorage.setItem('composio-user-id', newId);
  return newId;
};

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      userId: getOrCreateUserId(),
      logs: [],
      addLog: (step, msg) =>
        set((s) => ({
          logs: [...s.logs, { step, msg, time: Date.now() }]
        })),
      clearLogs: () => set({ logs: [] })
    }),
    { name: 'agent' }
  )
);
