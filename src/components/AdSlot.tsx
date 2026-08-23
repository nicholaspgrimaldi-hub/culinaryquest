import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { AdSettings } from "../lib/types";

// Reserves a clearly-bounded, unobtrusive space for a Google AdSense unit.
// Renders nothing (not even the reserved box) until an admin flips ad_settings.enabled
// to true and fills in a publisher/slot ID from the /admin page. Once enabled, it
// loads the AdSense script once and pushes a real ad unit into the slot.
let adsenseScriptLoaded = false;

function loadAdsenseScript(publisherId: string) {
  if (adsenseScriptLoaded) return;
  adsenseScriptLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

export function AdSlot({ placement }: { placement: "sidebar" | "footer" | "infeed" }) {
  const [settings, setSettings] = useState<AdSettings | null>(null);

  useEffect(() => {
    supabase
      .from("ad_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle()
      .then(({ data }) => setSettings(data as AdSettings | null));
  }, []);

  if (!settings?.enabled || !settings.publisher_id) return null;

  const slotId =
    placement === "sidebar" ? settings.slot_sidebar : placement === "footer" ? settings.slot_footer : settings.slot_infeed;
  if (!slotId) return null;

  loadAdsenseScript(settings.publisher_id);

  return (
    <div className="my-4 flex justify-center" data-ad-placement={placement}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", maxWidth: placement === "sidebar" ? 300 : 728 }}
        data-ad-client={settings.publisher_id}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        ref={(el) => {
          if (el && !el.getAttribute("data-loaded")) {
            el.setAttribute("data-loaded", "true");
            try {
              // @ts-ignore
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch {
              /* ignore until script is ready */
            }
          }
        }}
      />
    </div>
  );
}
