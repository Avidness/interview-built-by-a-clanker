import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "~/lib/auth";

interface AuthGateProps {
  /** Heading shown to guests, e.g. "Sign in to view your cart". */
  title: string;
  /** Rendered while a stored token is being verified, instead of the guest prompt. */
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Renders `children` for a signed-in user, the sign-in prompt for a guest,
 * and `fallback` while the session is still being restored on page load, so
 * protected pages never flash the guest prompt at a signed-in user.
 */
export function AuthGate({ title, fallback, children }: AuthGateProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
          Go to sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
