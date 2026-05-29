import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
  type AppSettingsUpdate
} from "../../../shared/settingsTypes.js";
import { getDatabase } from "../client.js";
import { appSettings } from "../schema.js";
import { eq } from "drizzle-orm";

const SETTINGS_KEY = "app";

/** Reads the single settings row and merges it over defaults. */
export const getAppSettings = (): AppSettings => {
  const database = getDatabase();
  const row = database
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SETTINGS_KEY))
    .get();

  if (!row) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    const parsed = JSON.parse(row.value) as AppSettingsUpdate;
    return normalizeAppSettings(DEFAULT_APP_SETTINGS, parsed);
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const updateAppSettings = (patch: AppSettingsUpdate): AppSettings => {
  const next = normalizeAppSettings(getAppSettings(), patch);
  const database = getDatabase();
  const now = new Date().toISOString();

  database
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, value: JSON.stringify(next), updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: JSON.stringify(next), updatedAt: now }
    })
    .run();

  return next;
};
