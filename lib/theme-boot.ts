import type { Appearance } from "./types.ts";
import { THEMES } from "./themes.ts";

/**
 * Theme boot helpers — pure module (no React) so the root layout, the
 * provider and the demo store can all share the same storage key and the
 * same pre-paint script.
 */

export const STORAGE_KEY = "btcomms.appearance.v1";

/** Read the saved appearance without touching React (SSR-safe). */
export function readStoredAppearance(): Partial<Appearance> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Appearance>;
  } catch {
    return null;
  }
}

/**
 * Inline script injected into <head>. It runs before first paint so the shell
 * is already tinted on reload — no flash of the wrong theme, and no flash of
 * unstyled content while the JS bundle boots.
 */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{
var raw=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(!raw)return;
var a=JSON.parse(raw)||{},r=document.documentElement;
var themes=${JSON.stringify(Object.fromEntries(THEMES.map((t) => [t.id, t])))};
var t=themes[a.theme_id]||themes.ambient;
if(!t)return;
for(var k in t.vars){r.style.setProperty(k,t.vars[k]);}
var amb=t.ambient||[];
if(t.id==="custom"&&a.gradient_from&&a.gradient_to){
  amb=[a.gradient_from+"88",a.gradient_to+"55","rgba(16,12,26,0.94)"];
}
r.style.setProperty("--ambient-1",amb[0]||"rgba(168,85,247,0.4)");
r.style.setProperty("--ambient-2",amb[1]||"rgba(251,146,60,0.2)");
r.style.setProperty("--ambient-3",amb[2]||"rgba(16,12,26,0.9)");
var from=(t.id==="custom"&&a.gradient_from)||t.gradient[0];
var to=(t.id==="custom"&&a.gradient_to)||t.gradient[1];
r.style.setProperty("--bg-app-gradient","linear-gradient(165deg, "+from+" 0%, "+to+" 62%, "+t.gradient[1]+" 100%)");
r.dataset.theme=t.id;
r.dataset.ambient=t.ambientShell?"true":"false";
if(a.message_density){r.dataset.density=a.message_density;}
r.dataset.motion=a.reduce_motion?"reduced":"full";
r.dataset.saturation=a.reduced_saturation?"reduced":"full";
r.style.setProperty("--font-scale",String(a.font_scale||1));
r.style.colorScheme=t.dark?"dark":"light";
}catch(e){}})();`;
