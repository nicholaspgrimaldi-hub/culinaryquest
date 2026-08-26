import type { Restaurant } from "../lib/types";
import { priceLevelToDollars } from "../lib/distance";

export function RestaurantCard({
  restaurant,
  wishlisted,
  visited,
  dismissed,
  onToggleWishlist,
  onToggleDismiss,
  onLogVisit,
}: {
  restaurant: Restaurant;
  wishlisted?: boolean;
  visited?: boolean;
  dismissed?: boolean;
  onToggleWishlist?: () => void;
  onToggleDismiss?: () => void;
  onLogVisit?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col ${
        dismissed ? "border-stone-200 opacity-70" : "border-orange-100"
      }`}
    >
      <div className="relative h-44 bg-stone-200">
        {restaurant.photo_url ? (
          <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        <div className="absolute top-2 left-2 flex gap-2">
          {restaurant.distance_mi != null && (
            <span className="bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full">
              📍 {restaurant.distance_mi.toFixed(1)} mi
            </span>
          )}
        </div>
        <button
          onClick={onToggleWishlist}
          className="absolute top-2 right-2 bg-white/90 rounded-full h-8 w-8 flex items-center justify-center shadow"
          aria-label="Toggle wishlist"
        >
          {wishlisted ? "❤️" : "🤍"}
        </button>
        <div className="absolute bottom-2 left-2">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full text-white ${
              dismissed ? "bg-stone-500" : visited ? "bg-emerald-500" : "bg-teal-500"
            }`}
          >
            {dismissed ? "Ignored" : visited ? "Visited" : "Unvisited Gem"}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 bg-white/90 text-xs font-bold px-2 py-1 rounded-full">
          {priceLevelToDollars(restaurant.price_level)}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-stone-800 leading-tight">{restaurant.name}</h3>
          {restaurant.rating != null && (
            <span className="shrink-0 text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              ⭐ {restaurant.rating} {restaurant.review_count ? `(${restaurant.review_count})` : ""}
            </span>
          )}
        </div>
        {restaurant.tagline && <p className="text-sm italic text-orange-600">"{restaurant.tagline}"</p>}
        <p className="text-xs text-stone-500">
          {restaurant.city ?? ""}
          {restaurant.state ? `, ${restaurant.state}` : ""}
          {restaurant.cuisines?.length ? ` · ${restaurant.cuisines.join(", ")}` : ""}
        </p>
        {restaurant.signature_dishes?.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-2 text-xs text-stone-600">
            <span className="font-semibold text-stone-700">🍴 Must-order: </span>
            {restaurant.signature_dishes.join(", ")}
          </div>
        )}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          {!dismissed && (
            <button
              onClick={onLogVisit}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg px-3 py-2"
            >
              Log Visit & Rate
            </button>
          )}
          <button
            onClick={onToggleDismiss}
            className={`text-sm font-semibold rounded-lg px-3 py-2 border-2 ${
              dismissed
                ? "flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
                : "border-stone-300 text-stone-500 hover:bg-stone-50"
            }`}
          >
            {dismissed ? "↩️ Add Back to Quest" : "🚫 Remove from Consideration"}
          </button>
        </div>
        <div className="flex gap-3 text-xs">
          {restaurant.lat && restaurant.lng && (
            <a
              className="text-stone-500 hover:text-orange-600"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
            >
              🧭 Directions
            </a>
          )}
          {restaurant.google_place_id && (
            <a
              className="text-stone-500 hover:text-orange-600"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`}
            >
              Google Maps ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
