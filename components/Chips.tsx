"use client";

/** A row of toggle chips. Pass `multi` to allow more than one selection. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
  multi?: boolean;
}) {
  const toggle = (id: T) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
    } else {
      onChange(value.includes(id) ? [] : [id]);
    }
  };
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="chip"
          aria-pressed={value.includes(o.id)}
          onClick={() => toggle(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
