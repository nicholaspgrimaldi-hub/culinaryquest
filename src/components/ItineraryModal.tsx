export type Itinerary = {
  headline: string;
  tagline: string;
  timeline: { time: string; place: string; title: string; description: string }[];
  recommended_dishes: string[];
  conversation_starters: string[];
  pro_tips: string[];
};

export function ItineraryModal({ itinerary, onClose }: { itinerary: Itinerary; onClose: () => void }) {
  const shareText = encodeURIComponent(
    `${itinerary.headline}

${itinerary.timeline.map((t) => `${t.time} — ${t.title} @ ${t.place}`).join("
")}`
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-bold uppercase text-orange-500">✨ AI Date Night Concierge</p>
            <h3 className="text-xl font-extrabold text-stone-800">{itinerary.headline}</h3>
            <p className="text-sm italic text-stone-500">"{itinerary.tagline}"</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl shrink-0">
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <a
            href={`sms:?&body=${shareText}`}
            className="flex-1 text-center bg-indigo-600 text-white text-xs font-bold rounded-lg px-3 py-2"
          >
            💬 Text to Spouse
          </a>
        </div>

        <h4 className="text-xs font-bold uppercase text-stone-500 mb-2">Evening Timeline</h4>
        <div className="flex flex-col gap-3 mb-4">
          {itinerary.timeline.map((stop, i) => (
            <div key={i} className="border-l-2 border-orange-300 pl-3">
              <p className="text-xs font-bold text-orange-600">{stop.time} · {stop.place}</p>
              <p className="text-sm font-semibold text-stone-800">{stop.title}</p>
              <p className="text-xs text-stone-500">{stop.description}</p>
            </div>
          ))}
        </div>

        {itinerary.recommended_dishes?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase text-stone-500 mb-1">Recommended Dishes</h4>
            <div className="flex flex-wrap gap-2">
              {itinerary.recommended_dishes.map((d, i) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-700 rounded-full px-3 py-1">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {itinerary.conversation_starters?.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase text-stone-500 mb-1">Conversation Sparkers</h4>
            <ul className="text-sm text-stone-600 list-disc list-inside">
              {itinerary.conversation_starters.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {itinerary.pro_tips?.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-3">
            <h4 className="text-xs font-bold uppercase text-amber-700 mb-1">💡 Pro Tips</h4>
            <ul className="text-xs text-amber-800 list-disc list-inside">
              {itinerary.pro_tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
