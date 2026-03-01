import { useState, useEffect } from "react";
import { Smartphone, X } from "lucide-react";
import { usePWAInstall, getInstallTutorialDismissed, setInstallTutorialDismissed } from "@/hooks/usePWAInstall";

export const INSTALL_TUTORIAL_OPEN_EVENT = "globeplot-open-install-tutorial";

export function InstallPromptBanner() {
  const { isStandalone, platform, canShowInstallPrompt } = usePWAInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShowInstallPrompt || platform !== "ios") return;
    if (getInstallTutorialDismissed()) return;
    // Small delay so we don't show immediately on load
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [canShowInstallPrompt, platform]);

  const handleAdd = () => {
    setVisible(false);
    setInstallTutorialDismissed(true);
    window.dispatchEvent(new CustomEvent(INSTALL_TUTORIAL_OPEN_EVENT, { detail: {} }));
  };

  const handleDismiss = () => {
    setVisible(false);
    setInstallTutorialDismissed(true);
  };

  if (isStandalone || !visible) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm animate-in slide-in-from-bottom-4 duration-300"
      role="alert"
      aria-live="polite"
    >
      <Smartphone className="h-8 w-8 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">Add Globeplot to your home screen</p>
        <p className="text-xs text-muted-foreground mt-0.5">Quick access and offline use</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          How
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
