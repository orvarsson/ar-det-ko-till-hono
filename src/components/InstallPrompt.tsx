import { useEffect, useRef, useState } from "react";
import styles from "./InstallPrompt.module.scss";

// Minimal shape of the (non-standard) beforeinstallprompt event. Chrome/Android
// fires this so we can defer the native install prompt behind our own button.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "a2hs-dismissed-at";
// Once dismissed, stay quiet for a month so we never nag.
const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes standalone on navigator, not via matchMedia.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode / storage disabled — fine, the popup just reappears later.
  }
}

// A bottom popup, styled like a native install banner, nudging mobile users to
// add the site to their home screen. iOS gets manual instructions (no
// programmatic install); Android/Chrome gets a one-tap install button wired to
// the deferred beforeinstallprompt event. Renders nothing on desktop, when
// already installed, or shortly after a dismissal.
export function InstallPrompt() {
  const [mode, setMode] = useState<"ios" | "android" | null>(null);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPadOS 13+ reports as a Mac; disambiguate via touch support.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /android/i.test(ua);
    if (!isIOS && !isAndroid) return;

    if (isIOS) {
      // Safari has no install event — show the manual Share instructions.
      setMode("ios");
      return;
    }

    // Android/Chrome: hold the native prompt and surface our own button.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setMode("android");
    };
    const onInstalled = () => {
      rememberDismissed();
      setMode(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mode) return null;

  const dismiss = () => {
    rememberDismissed();
    setMode(null);
  };

  const install = async () => {
    const event = deferred.current;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    deferred.current = null;
    dismiss();
  };

  return (
    <div className={styles.popup} role="region" aria-label="Lägg till på hemskärmen">
      <span className={styles.icon} aria-hidden="true">
        <img src="/icon-192.png" alt="" width={40} height={40} />
      </span>
      <div className={styles.body}>
        <p className={styles.title}>Lägg till på hemskärmen</p>
        {mode === "ios" ? (
          <p className={styles.text}>
            Tryck på <ShareIcon /> Dela och välj{" "}
            <strong>”Lägg till på hemskärmen”</strong> för snabb åtkomst.
          </p>
        ) : (
          <p className={styles.text}>
            Installera appen för snabb åtkomst – direkt från hemskärmen.
          </p>
        )}
      </div>
      {mode === "android" && (
        <button type="button" className={styles.install} onClick={install}>
          Lägg till
        </button>
      )}
      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Stäng"
      >
        ×
      </button>
    </div>
  );
}

// The iOS system Share glyph (rounded square with an up-arrow), inlined so the
// instructions match what users actually see in Safari's toolbar.
function ShareIcon() {
  return (
    <svg
      className={styles.shareGlyph}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 3v11M12 3l-3.5 3.5M12 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
