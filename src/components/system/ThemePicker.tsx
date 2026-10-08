import { Check, Computer, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { RetroButton } from "@/components/ui/RetroButton";
import { useTheme } from "@/hooks/useTheme";
import { THEMES, THEME_IDS, supportsAppearance, type Appearance, type ThemeId } from "@/lib/theme";

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

  const choose = (id: ThemeId) => {
    onPick?.(id);
    setTheme(id).catch(() => {
      toast.error(`Could not load the ${THEMES[id].name} theme.`, {
        description: "Check the connection and try again.",
      });
    });
  };

  return (
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
            <span className="theme-picker-tagline">{definition.tagline}</span>
          </button>
        );
      })}
    </div>
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
