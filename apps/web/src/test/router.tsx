import type { ReactNode } from "react";

/**
 * Minimal stand-in for TanStack Router's <Link> so components can render
 * outside a RouterProvider. Resolves `$param` segments from `params`.
 */
export function FakeLink({
  to,
  params,
  children,
  className,
  title,
}: {
  to: string;
  params?: Record<string, string>;
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  const href = to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? "");
  return (
    <a href={href} className={className} title={title}>
      {children}
    </a>
  );
}
