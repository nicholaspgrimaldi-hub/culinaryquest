import { NavLink } from "react-router-dom";
import { useCouple } from "../context/CoupleProvider";
import { useAuth } from "../context/AuthProvider";

const TABS = [
  { to: "/discover", label: "Discover", icon: "🎯" },
  { to: "/map", label: "Radar Map", icon: "📍" },
  { to: "/spinner", label: "Date Night Spinner", icon: "🎲" },
  { to: "/concierge", label: "AI Date Concierge", icon: "✨" },
  { to: "/reviews", label: "Our Reviews", icon: "📖" },
  { to: "/badges", label: "Badges", icon: "🏅" },
];

export function NavBar() {
  const { couple, activeHub } = useCouple();
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-orange-50/95 backdrop-blur border-b border-orange-200">
      <div className="max-w-6xl mx-auto px-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍴</span>
            <span className="font-extrabold text-lg text-stone-800">Culinary Quest</span>
            {activeHub && (
              <span className="ml-2 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1">
                🏡 {activeHub.label} · {activeHub.radius_miles}mi
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <NavLink to="/hubs" className="text-stone-600 hover:text-orange-600 font-medium">
              Switch Hub
            </NavLink>
            <NavLink to="/crew" className="text-stone-600 hover:text-orange-600 font-medium">
              👥 Crew
            </NavLink>
            <NavLink to="/settings" className="text-stone-600 hover:text-orange-600 font-medium">
              ⚙️
            </NavLink>
            {profile?.role === "admin" && (
              <NavLink to="/admin" className="text-stone-600 hover:text-orange-600 font-medium">
                🛠 Admin
              </NavLink>
            )}
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-orange-500 text-white shadow"
                    : "bg-white text-stone-600 hover:bg-orange-100 border border-orange-200"
                }`
              }
            >
              {tab.icon} {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {!couple ? null : null}
    </header>
  );
}
