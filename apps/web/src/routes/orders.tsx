import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import type { Order } from "@acme/shared";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OrdersSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-6 h-32" />
      ))}
    </div>
  );
}

function OrdersPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/orders"),
    enabled: !!user,
  });

  if (isAuthLoading) {
    return <OrdersSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sign in to view your orders
        </h2>
        <Link
          to="/login"
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <OrdersSkeleton />;
  }

  // The API returns orders in creation order; show the newest first.
  const orders = [...(data?.orders ?? [])].reverse();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">
            You haven't placed any orders yet.
          </p>
          <Link
            to="/"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Browse personas
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div>
                  <p className="font-mono text-sm text-gray-900">{order.id}</p>
                  <p className="text-sm text-gray-500">
                    <time dateTime={order.createdAt}>
                      {formatDate(order.createdAt)}
                    </time>
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  ${order.total.toFixed(2)}
                </p>
              </div>
              <ul className="space-y-1 border-t pt-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.persona.name} x{item.quantity}
                    </span>
                    <span className="text-gray-900">
                      ${(item.persona.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
