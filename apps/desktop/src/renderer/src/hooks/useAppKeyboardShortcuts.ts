import { useEffect, useRef } from "react";

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;

  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

const matchesShortcut = (
  event: KeyboardEvent,
  key: string,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean }
): boolean => {
  const wantsCtrl = modifiers.ctrl ?? false;
  const wantsShift = modifiers.shift ?? false;
  const wantsAlt = modifiers.alt ?? false;
  const hasCtrl = event.ctrlKey || event.metaKey;

  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    hasCtrl === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt
  );
};

export interface AppShortcutHandlers {
  onCommandPalette: () => void;
  onCreateTask: () => void;
  onLaunchAgent: () => void;
  onRunChecks: () => void;
  onOpenTerminal: () => void;
  onSwitchNav: (index: number) => void;
  onTerminalNextTab: () => void;
  onTerminalPreviousTab: () => void;
  onTerminalNewTab: () => void;
}

export const useAppKeyboardShortcuts = (handlers: AppShortcutHandlers): void => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const current = handlersRef.current;

      if (matchesShortcut(event, "p", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onCommandPalette();
        return;
      }

      if (matchesShortcut(event, "k", { ctrl: true })) {
        event.preventDefault();
        current.onCommandPalette();
        return;
      }

      if (matchesShortcut(event, "n", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onCreateTask();
        return;
      }

      if (matchesShortcut(event, "l", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onLaunchAgent();
        return;
      }

      if (matchesShortcut(event, "q", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onRunChecks();
        return;
      }

      if (matchesShortcut(event, "`", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onOpenTerminal();
        return;
      }

      if (matchesShortcut(event, "t", { ctrl: true, shift: true })) {
        event.preventDefault();
        current.onTerminalNewTab();
        return;
      }

      if (matchesShortcut(event, "Tab", { ctrl: true })) {
        event.preventDefault();
        if (event.shiftKey) {
          current.onTerminalPreviousTab();
        } else {
          current.onTerminalNextTab();
        }
        return;
      }

      const digit = Number.parseInt(event.key, 10);

      if (hasCtrlDigitShortcut(event) && digit >= 1 && digit <= 9) {
        event.preventDefault();
        current.onSwitchNav(digit - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
};

const hasCtrlDigitShortcut = (event: KeyboardEvent): boolean => {
  const hasCtrl = event.ctrlKey || event.metaKey;

  return hasCtrl && !event.shiftKey && !event.altKey;
};
