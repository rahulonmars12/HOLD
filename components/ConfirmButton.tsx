"use client";

import { useEffect, useState } from "react";

/**
 * A destructive button that asks for a second tap instead of opening a
 * dialog. It disarms itself after a few seconds.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = "btn btn-danger",
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
