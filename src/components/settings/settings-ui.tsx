import type { ReactNode } from "react";

/** Notion settings layout: section title + hairline, rows of label/description ↔ control. */
export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="border-b border-line pb-2.5 text-[16px] font-medium">{title}</h2>
      {description && <p className="mt-2 text-[13px] text-fg-2">{description}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[14px]">{label}</div>
        {description && <div className="mt-0.5 max-w-md text-[12px] leading-snug text-fg-2">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
