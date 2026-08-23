import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthProvider";
import { useCouple } from "./context/CoupleProvider";
import { NavBar } from "./components/NavBar";
import { AdSlot } from "./components/AdSlot";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Discover } from "./pages/Discover";
import { RadarMap } from "./pages/RadarMap";
import { Spinner } from "./pages/Spinner";
import { Reviews } from "./pages/Reviews";
import { Badges } from "./pages/Badges";
import { Crew } from "./pages/Crew";
import { Hubs } from "./pages/Hubs";
import { Settings } from "./pages/Settings";
import { Admin } from "./pages/Admin";

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const { couple, activeHub, loading: coupleLoading } = useCouple();

  if (authLoading) return <CenteredLoader />;
  if (!session) return <Login />;
  if (coupleLoading) return <CenteredLoader />;
  if (!couple || !activeHub) return <Onboarding />;

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/map" element={<RadarMap />} />
          <Route path="/spinner" element={<Spinner />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/crew" element={<Crew />} />
          <Route path="/hubs" element={<Hubs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
        <AdSlot placement="infeed" />
      </main>
      <footer className="border-t border-orange-200 bg-white/60 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4">
          <AdSlot placement="footer" />
          <p className="text-center text-xs text-stone-400 mt-2">
            Culinary Quest · Home Base: {activeHub.label} ({activeHub.radius_miles}-Mile Radius)
          </p>
        </div>
      </footer>
    </div>
  );
}

function CenteredLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-stone-500">
      <div className="animate-pulse text-2xl">🍴 Loading your quest…</div>
    </div>
  );
}
