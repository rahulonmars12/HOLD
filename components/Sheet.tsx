"use client";

import { useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";

/** A bottom sheet built on the native dialog, so focus and Escape just work. */
export function Sheet({
  open,
  onClose,
  title,
  aside,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Shown to the right of the title, such as an attempt number. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      sfx("sheet");
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        // A tap on the backdrop lands on the dialog element itself.
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div>
          <div aria-hidden className="mx-auto h-[5px] w-11 rounded-full bg-line" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <h2 className="display text-[1.625rem] leading-[1.12]">{title}</h2>
            {aside}
          </div>
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
