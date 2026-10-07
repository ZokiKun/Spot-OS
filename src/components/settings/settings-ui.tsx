import type { ReactNode } from "react";

/** Notion settings layout: section title + hairline, rows of label/description ↔ control. */
export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border-2 border-line px-5 pb-2 pt-4">
      <h3 className="text-[17px] font-extrabold">{title}</h3>
      {description && <p className="mt-0.5 text-[13.5px] font-semibold text-fg-2">{description}</p>}
      <div className="mt-2 divide-y-2 divide-line">{children}</div>
    </section>
  );
}

export function SettingsRow({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[15px] font-bold">{label}</div>
        {description && <div className="mt-0.5 max-w-md text-[13px] font-semibold leading-snug text-fg-2">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
