import Link from "next/link";

function Arrow({ plus }: { plus?: boolean }) {
  return (
    <span aria-hidden className="cta-dot">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {plus ? <path d="M11 3v16M3 11h16" /> : <path d="M4 11h13M12 5l6 6-6 6" />}
      </svg>
    </span>
  );
}

/** The screen's one main action, with the drifting hold-colour gradient. */
export function Cta({
  children,
  href,
  onClick,
  type = "button",
  disabled,
  plus,
  bare,
  sfx,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Use a plus instead of an arrow. */
  plus?: boolean;
  /** No arrow circle; label centred. */
  bare?: boolean;
  className?: string;
  /** A special sound for this action, such as "save". */
  sfx?: string;
}) {
  const cls = `cta ${bare ? "cta-center" : ""} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {!bare && <Arrow plus={plus} />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} data-sfx={sfx}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} data-sfx={sfx}>
      {inner}
    </button>
  );
}
