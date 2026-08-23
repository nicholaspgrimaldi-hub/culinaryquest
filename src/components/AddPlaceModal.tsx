import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthProvider";
import { useCouple } from "../context/CoupleProvider";

const CUISINES = [
  "Italian",
  "Steakhouse",
  "Seafood",
  "Japanese & Sushi",
  "French",
  "New American",
  "Mediterranean & Greek",
  "Mexican & Latin",
  "Asian Fusion & Thai",
  "Tapas & Small Plates",
  "Breakfast & Brunch",
  "Dessert & Bakery",
];

export function AddPlaceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const { activeHub } = useCouple();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState(activeHub?.city ?? "");
  const [rating, setRating] = useState("4.8");
  const [reviewCount, setReviewCount] = useState("");
  const [priceLevel, setPriceLevel] = useState(3);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [dishes, setDishes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCuisine(c: string) {
    setCuisines((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function handleSave() {
    if (!activeHub) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertErr } = await supabase.from("restaurants").insert({
        hub_id: activeHub.id,
        name,
        tagline: tagline || null,
        address: address || null,
        city: city || activeHub.city,
        state: activeHub.state,
        lat: activeHub.lat,
        lng: activeHub.lng,
        rating: rating ? Number(rating) : null,
        review_count: reviewCount ? Number(reviewCount) : null,
        price_level: priceLevel,
        cuisines,
        signature_dishes: dishes ? dishes.split(",").map((d) => d.trim()).filter(Boolean) : [],
        photo_url: photoUrl || null,
        phone: phone || null,
        description: description || null,
        source: "manual",
        created_by: session?.user.id,
      });
      if (insertErr) throw insertErr;
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-extrabold text-stone-800">➕ Add Custom Restaurant to Quest</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Restaurant name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Catchy tagline</label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Street address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Rating</label>
              <input value={rating} onChange={(e) => setRating(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Review count</label>
              <input value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Price</label>
              <select value={priceLevel} onChange={(e) => setPriceLevel(Number(e.target.value))} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm">
                <option value={1}>$</option>
                <option value={2}>$$</option>
                <option value={3}>$$$</option>
                <option value={4}>$$$$</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Cuisines</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCuisine(c)}
                  className={`text-xs font-semibold rounded-full px-3 py-1.5 border ${
                    cuisines.includes(c) ? "bg-orange-500 text-white border-orange-500" : "border-stone-300 text-stone-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Signature dishes (comma separated)</label>
            <input value={dishes} onChange={(e) => setDishes(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Photo URL</label>
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Description & why it's special</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border rounded-lg px-3 py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy || !name}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-semibold"
            >
              {busy ? "Adding…" : "Add to Quest"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
