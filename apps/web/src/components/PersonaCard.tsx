import { Link } from "@tanstack/react-router";
import type { Persona } from "@acme/shared";
import { StarRating } from "./StarRating";

const tierColors = {
  Starter: "bg-green-100 text-green-800",
  Pro: "bg-blue-100 text-blue-800",
  Enterprise: "bg-purple-100 text-purple-800",
};

interface PersonaCardProps {
  persona: Persona;
  /** Shows a small filled heart when the signed-in user has favorited this persona. */
  isFavorited?: boolean;
}

export function PersonaCard({ persona, isFavorited = false }: PersonaCardProps) {
  return (
    <Link
      to="/personas/$personaId"
      params={{ personaId: persona.id }}
      className="relative block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all group"
    >
      {isFavorited && (
        <svg
          className="absolute top-3 left-3 w-4 h-4 text-red-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          role="img"
          aria-label="Favorited"
        >
          <title>Favorited</title>
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={persona.avatarUrl}
          alt={persona.name}
          className="w-14 h-14 rounded-xl bg-gray-100 group-hover:scale-105 transition-transform"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {persona.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${tierColors[persona.tier]}`}
            >
              {persona.tier}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{persona.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {persona.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
          >
            {cap}
          </span>
        ))}
        {persona.capabilities.length > 3 && (
          <span className="text-xs text-gray-400 px-2 py-1">
            +{persona.capabilities.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={persona.rating} size="sm" />
          <span className="text-xs text-gray-400">
            ({persona.reviewCount})
          </span>
        </div>
        <p className="text-lg font-bold text-gray-900">
          ${(persona.price * 100).toFixed(2)}
          <span className="text-xs font-normal text-gray-500">/mo</span>
        </p>
      </div>
    </Link>
  );
}
