"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Label of the confirming button (default "Delete"). */
  confirmLabel?: string;
  /** Red confirm button (default true — most confirmations are deletes). */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<Confirm>(async () => false);

/**
 * In-app confirmation instead of window.confirm(). Browsers let people tick "don't allow this page
 * to show more dialogs", after which confirm() silently returns false — deletes then stop working.
 */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false); // a newer question replaces an unanswered one
        resolver.current = resolve;
        setCurrent(options);
      }),
    [],
  );

  const answer = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setCurrent(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const danger = current?.danger ?? true;

  return (
    <ConfirmContext value={value}>
      {children}
      <Dialog
        open={!!current}
        onClose={() => answer(false)}
        title={current?.title}
        width={420}
        footer={
          <>
            <Button onClick={() => answer(false)}>Cancel</Button>
            <Button
              autoFocus
              variant="primary"
              className={danger ? "!bg-[var(--danger)] hover:!bg-[color-mix(in_srgb,var(--danger)_85%,black)]" : undefined}
              onClick={() => answer(true)}
            >
              {current?.confirmLabel ?? "Delete"}
            </Button>
          </>
        }
      >
        {current?.description ? <div className="pb-1 text-[14px] text-fg-2">{current.description}</div> : null}
      </Dialog>
    </ConfirmContext>
  );
}
