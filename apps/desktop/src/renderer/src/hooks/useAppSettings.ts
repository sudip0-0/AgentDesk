import { useEffect, useState } from "react";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "../../../shared/settingsTypes";

/**
 * Loads global app settings once on mount, falling back to defaults.
 * Used by flows that must honor approval/confirmation preferences.
 */
export const useAppSettings = (): AppSettings => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    void window.agentdesk.settings
      .get()
      .then((loaded: AppSettings) => {
        if (!cancelled) {
          setSettings(loaded);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
};
