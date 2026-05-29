import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_UI_PREFERENCES,
  normalizeAppSettings,
  normalizeUiPreferences,
  type AppSettings,
  type AppSettingsUpdate,
  type UiPreferences,
  type UiPreferencesUpdate
} from "../../../shared/settingsTypes.js";
import { getDatabase } from "../client.js";
import { appSettings } from "../schema.js";
import { eq } from "drizzle-orm";

const SETTINGS_KEY = "app";
const UI_PREFERENCES_KEY = "ui";

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

export const getUiPreferences = (): UiPreferences => {
  const database = getDatabase();
  const row = database
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, UI_PREFERENCES_KEY))
    .get();

  if (!row) {
    return { ...DEFAULT_UI_PREFERENCES };
  }

  try {
    const parsed = JSON.parse(row.value) as UiPreferencesUpdate;
    return normalizeUiPreferences(DEFAULT_UI_PREFERENCES, parsed);
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
};

export const updateUiPreferences = (patch: UiPreferencesUpdate): UiPreferences => {
  const current = getUiPreferences();
  // Merge per-project selections so updating one project keeps the others.
  const mergedPatch: UiPreferencesUpdate = {
    ...patch,
    projectSelections: patch.projectSelections
      ? { ...current.projectSelections, ...patch.projectSelections }
      : current.projectSelections
  };
  const next = normalizeUiPreferences(current, mergedPatch);
  const database = getDatabase();
  const now = new Date().toISOString();

  database
    .insert(appSettings)
    .values({ key: UI_PREFERENCES_KEY, value: JSON.stringify(next), updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: JSON.stringify(next), updatedAt: now }
    })
    .run();

  return next;
};
