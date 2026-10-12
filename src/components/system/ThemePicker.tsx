import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Computer, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { RetroButton } from "@/components/ui/RetroButton";
import { CustomIcon } from "@/components/window/CustomIcon";
import { useTheme } from "@/hooks/useTheme";
import { PALM_FRAME_QUERY, THEMES, THEME_IDS, supportsAppearance, type Appearance, type ThemeId } from "@/lib/theme";

/** True when switching to `next` would shrink this screen's desktop into the handheld frame. */
const shrinksDesktop = (next: ThemeId, current: ThemeId) => (
  THEMES[next].layout === "palm"
  && THEMES[current].layout !== "palm"
  && typeof window !== "undefined"
  && typeof window.matchMedia === "function"
  && window.matchMedia(PALM_FRAME_QUERY).matches
);

/**
 * The double check before a handheld theme takes over a large screen: the
 * desktop shrinks to a phone-sized frame and every window with it, which is a
 * surprise to someone who only wanted to see the theme.
 */
const HandheldConfirm = ({ next, current, onConfirm, onCancel }: {
  next: ThemeId;
  current: ThemeId;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onCancel]);

  const name = THEMES[next].name;
  return createPortal(
    <div
      className="system-dialog-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="window-surface system-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="handheld-confirm-title"
        aria-describedby="handheld-confirm-text"
      >
        <div className="window-titlebar">
          <CustomIcon iconType="config" className="h-4 w-4" />
          <span id="handheld-confirm-title" className="flex-1 truncate">Switch to {name}?</span>
        </div>
        <div id="handheld-confirm-text" className="system-dialog-body">
          <p>
            {name} is a handheld theme, made for a phone. On this screen the desktop shrinks to a
            phone-sized frame in the middle, and every open window is resized to fit it.
          </p>
          <p>Config, or the search beside the clock, brings the full desktop back with any other theme.</p>
        </div>
        <div className="system-dialog-actions">
          <RetroButton ref={cancelRef} onClick={onCancel}>Keep {THEMES[current].name}</RetroButton>
          <RetroButton variant="primary" onClick={onConfirm}>Switch to {name}</RetroButton>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * Miniature desktop drawn entirely by base CSS, so every theme can be
 * previewed before its stylesheet has been downloaded.
 */
export const ThemeSwatch = ({ theme }: { theme: ThemeId }) => (
  <span className="theme-swatch" data-swatch={theme} aria-hidden="true">
    <span className="theme-swatch-window">
      <span className="theme-swatch-titlebar">
        <span />
        <i /><i /><i />
      </span>
      <span className="theme-swatch-body">
        <span className="theme-swatch-line" />
        <span className="theme-swatch-line theme-swatch-line-short" />
        <span className="theme-swatch-button" />
      </span>
    </span>
    <span className="theme-swatch-taskbar"><span /></span>
  </span>
);

export const ThemePicker = ({ onPick }: { onPick?: (theme: ThemeId) => void }) => {
  const { theme, pendingTheme, setTheme, prefetchTheme } = useTheme();
  const [confirming, setConfirming] = useState<ThemeId | null>(null);

  const apply = (id: ThemeId) => {
    onPick?.(id);
    setTheme(id).catch(() => {
      toast.error(`Could not load the ${THEMES[id].name} theme.`, {
        description: "Check the connection and try again.",
      });
    });
  };

  const choose = (id: ThemeId) => {
    if (shrinksDesktop(id, theme)) setConfirming(id);
    else apply(id);
  };

  return (
    <>
    {confirming && (
      <HandheldConfirm
        next={confirming}
        current={theme}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          apply(confirming);
        }}
      />
    )}
    <div className="theme-picker" role="radiogroup" aria-label="Desktop theme">
      {THEME_IDS.map((id) => {
        const definition = THEMES[id];
        const active = theme === id;
        const pending = pendingTheme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            className="theme-picker-option"
            title={definition.tagline}
            data-active={active || undefined}
            data-pending={pending || undefined}
            onPointerEnter={() => prefetchTheme(id)}
            onFocus={() => prefetchTheme(id)}
            onClick={() => choose(id)}
          >
            <ThemeSwatch theme={id} />
            <span className="theme-picker-label">
              <strong>{definition.name}</strong>
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : active ? <Check className="h-3 w-3" /> : null}
            </span>
          </button>
        );
      })}
    </div>
    </>
  );
};

const APPEARANCE_OPTIONS: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Computer },
];

export const AppearancePicker = () => {
  const { theme, appearance, setAppearance } = useTheme();
  const enabled = supportsAppearance(theme);

  return (
    <div className="theme-appearance">
      <div className="config-theme-grid" role="radiogroup" aria-label="Color mode">
        {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
          <RetroButton
            key={value}
            role="radio"
            aria-checked={appearance === value}
            active={appearance === value}
            disabled={!enabled}
            onClick={() => setAppearance(value)}
          >
            <Icon className="h-4 w-4" /> {label}
          </RetroButton>
        ))}
      </div>
      {!enabled && (
        <p className="config-help-text">
          {THEMES[theme].name} uses its original palette. Color mode applies to themes with light and dark variants.
        </p>
      )}
    </div>
  );
};
