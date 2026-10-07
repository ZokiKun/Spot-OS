"use client";

import { createContext, useContext } from "react";

export interface ShellState {
  openSearch: () => void;
}

export const ShellContext = createContext<ShellState>({
  openSearch: () => {},
});

export const useShell = () => useContext(ShellContext);
