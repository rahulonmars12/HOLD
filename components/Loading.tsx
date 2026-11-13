/** A gentle placeholder while the log loads, so pages never flash blank. */
export function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-48 rounded-full" />
      <div className="skeleton mt-6 h-36 rounded-[1.75rem]" />
      <div className="skeleton mt-3 h-24 rounded-[1.75rem]" />
      <div className="skeleton mt-3 h-24 rounded-[1.75rem]" />
    </main>
  );
}
