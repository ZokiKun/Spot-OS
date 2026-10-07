"use client";

import { createContext, useContext } from "react";

export interface ShellState {
  openSearch: () => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  mobileNavOpen: boolean;
}

export const ShellContext = createContext<ShellState>({
  openSearch: () => {},
  openMobileNav: () => {},
  closeMobileNav: () => {},
  mobileNavOpen: false,
});

export const useShell = () => useContext(ShellContext);
