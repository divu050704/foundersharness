import { create } from "zustand";

/**
 * Zustand store for user state.
 *
 * NOTE for Next.js App Router: Global stores are singletons on the server and shared
 * across concurrent requests. To prevent data leakage between users, only read or write
 * user-specific state on the client side (e.g., inside useEffect or event handlers).
 */
const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export default useUserStore;
