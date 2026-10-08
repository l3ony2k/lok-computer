import { useEffect, useMemo, useState } from "react";
import { Cat, Check, Monitor, Palette } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { THEMES, type Appearance, type ThemeId } from "@/lib/theme";
import { AppearancePicker, ThemePicker } from "@/components/system/ThemePicker";
import { CustomIcon } from "@/components/window/CustomIcon";
import { RetroButton } from "@/components/ui/RetroButton";
import type { CrtSettings, OnekoSettings } from "@/hooks/useUserSettings";
import onekoDefault from "@/assets/oneko.gif";
import onekoDark from "@/assets/oneko-dark.gif";

export interface OobeSelection {
  theme: ThemeId;
  appearance: Appearance;
  oneko: Omit<OnekoSettings, "hasBeenAsked">;
  crt: CrtSettings;
}

interface OutOfBoxExperienceProps {
  isOpen: boolean;
  initialOneko?: Partial<OnekoSettings>;
  initialCrt?: Partial<CrtSettings>;
  onPreview: (selection: OobeSelection) => void;
  onComplete: (selection: OobeSelection) => void;
}

const STEPS = ["Welcome", "Appearance", "Cursor cat", "Display", "Ready"];

export const OutOfBoxExperience = ({
  isOpen,
  initialOneko,
  initialCrt,
  onPreview,
  onComplete,
}: OutOfBoxExperienceProps) => {
  const { theme, appearance } = useTheme();
  const [step, setStep] = useState(0);
  const [onekoEnabled, setOnekoEnabled] = useState(initialOneko?.enabled ?? false);
  const [onekoSpeed, setOnekoSpeed] = useState(initialOneko?.speed ?? 10);
  const [onekoVariant, setOnekoVariant] = useState<OnekoSettings["variant"]>(initialOneko?.variant ?? "default");
  const [crtEnabled, setCrtEnabled] = useState(initialCrt?.enabled ?? false);
  const [crtScanlines, setCrtScanlines] = useState(initialCrt?.scanlines ?? 50);
  const [crtFlicker, setCrtFlicker] = useState(initialCrt?.flicker ?? 10);
  const [crtRgbOffset, setCrtRgbOffset] = useState(initialCrt?.rgbOffset ?? 50);
  const [crtCurvature, setCrtCurvature] = useState(initialCrt?.curvature ?? 20);

  const selection = useMemo<OobeSelection>(() => ({
    theme,
    appearance,
    oneko: { enabled: onekoEnabled, speed: onekoSpeed, variant: onekoVariant },
    crt: {
      enabled: crtEnabled,
      scanlines: crtScanlines,
      flicker: crtFlicker,
      rgbOffset: crtRgbOffset,
      curvature: crtCurvature,
    },
  }), [crtCurvature, crtEnabled, crtFlicker, crtRgbOffset, crtScanlines, onekoEnabled, onekoSpeed, onekoVariant, theme, appearance]);

  useEffect(() => {
    if (isOpen) onPreview(selection);
  }, [isOpen, onPreview, selection]);

  if (!isOpen) return null;

  const finish = () => onComplete(selection);

  return (
    <div className="oobe-overlay" role="dialog" aria-modal="true" aria-labelledby="oobe-title">
      <div className="window-surface oobe-window">
        <div className="window-titlebar oobe-titlebar">
          <CustomIcon iconType="config" className="h-4 w-4" />
          <span id="oobe-title" className="flex-1 truncate">Set up lok.computer</span>
          <span className="oobe-step-count">{step + 1}/{STEPS.length}</span>
        </div>

        <div className="oobe-layout">
          <nav className="oobe-steps" aria-label="Setup progress">
            <div className="oobe-brand">
              <strong>Lok</strong>
              <span>initial setup</span>
            </div>
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                className="oobe-step"
                data-active={step === index || undefined}
                data-complete={index < step || undefined}
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
              >
                <span>{index < step ? <Check className="h-3 w-3" /> : String(index + 1).padStart(2, "0")}</span>
                {label}
              </button>
            ))}
          </nav>

          <main className="oobe-content">
            {step === 0 && (
              <section className="oobe-page">
                <div className="oobe-page-icon"><CustomIcon iconType="config" className="h-12 w-12" pixelated /></div>
                <div>
                  <h1>Welcome to lok.computer</h1>
                  <p>Choose the desktop defaults for this browser.</p>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="oobe-page">
                <div className="oobe-heading">
                  <Palette className="h-5 w-5" />
                  <div><h1>Appearance</h1><p>Choose a desktop theme. You can change it later in Config.</p></div>
                </div>
                <ThemePicker />
                <AppearancePicker />
              </section>
            )}

            {step === 2 && (
              <section className="oobe-page">
                <div className="oobe-heading">
                  <Cat className="h-5 w-5" />
                  <div><h1>Cursor cat</h1><p>Let the desktop cat chase the pointer.</p></div>
                </div>
                <div className="oobe-segmented" role="group" aria-label="Cursor cat">
                  <button type="button" data-active={!onekoEnabled || undefined} onClick={() => setOnekoEnabled(false)}>Off</button>
                  <button type="button" data-active={onekoEnabled || undefined} onClick={() => setOnekoEnabled(true)}>On</button>
                </div>

                <div className="oobe-live-preview oobe-oneko-preview" data-enabled={onekoEnabled || undefined}>
                  {onekoEnabled ? (
                    <span
                      aria-hidden="true"
                      style={{
                        backgroundImage: `url(${onekoVariant === "dark" ? onekoDark : onekoDefault})`,
                        backgroundPosition: "-96px -96px",
                      }}
                    />
                  ) : <small>Cursor cat is off</small>}
                  <small>{onekoEnabled ? "Move the pointer to preview the follower" : "Enable it to preview"}</small>
                </div>

                <label className="oobe-range-setting">
                  <span>Speed <output>{onekoSpeed}</output></span>
                  <input type="range" min={1} max={20} value={onekoSpeed} onChange={(event) => setOnekoSpeed(Number(event.target.value))} />
                </label>

                <div className="oobe-oneko-options" role="group" aria-label="Cursor cat color">
                  {([
                    { value: "default" as const, label: "White", image: onekoDefault },
                    { value: "dark" as const, label: "Black", image: onekoDark },
                  ]).map((variant) => (
                    <button key={variant.value} type="button" data-active={onekoVariant === variant.value || undefined} onClick={() => setOnekoVariant(variant.value)}>
                      <span style={{ backgroundImage: `url(${variant.image})`, backgroundPosition: "-96px -96px" }} />
                      {variant.label}
                    </button>
                  ))}
                </div>

                <p className="oobe-attribution">
                  Powered by <a href="https://github.com/adryd325/oneko.js" target="_blank" rel="noopener noreferrer">oneko.js</a>
                  {' · '}
                  <a href="https://en.wikipedia.org/wiki/Neko_(software)" target="_blank" rel="noopener noreferrer">Learn more</a>
                </p>
              </section>
            )}

            {step === 3 && (
              <section className="oobe-page">
                <div className="oobe-heading">
                  <Monitor className="h-5 w-5" />
                  <div><h1>Display effect</h1><p>Apply the CRT treatment to the desktop.</p></div>
                </div>
                <div className="oobe-segmented" role="group" aria-label="CRT effect">
                  <button type="button" data-active={!crtEnabled || undefined} onClick={() => setCrtEnabled(false)}>Off</button>
                  <button type="button" data-active={crtEnabled || undefined} onClick={() => setCrtEnabled(true)}>On</button>
                </div>

                <div className="oobe-live-preview oobe-crt-preview">
                  <span>lok@computer:~$ preview display</span>
                  <strong>{crtEnabled ? "CRT ONLINE" : "CRT OFFLINE"}</strong>
                  <small>Changes apply to this screen immediately.</small>
                </div>

                {([
                  { label: "Scanlines", value: crtScanlines, setValue: setCrtScanlines },
                  { label: "Flicker", value: crtFlicker, setValue: setCrtFlicker },
                  { label: "RGB offset", value: crtRgbOffset, setValue: setCrtRgbOffset },
                  { label: "Curvature", value: crtCurvature, setValue: setCrtCurvature },
                ]).map((setting) => (
                  <label className="oobe-range-setting" key={setting.label}>
                    <span>{setting.label} <output>{setting.value}%</output></span>
                    <input type="range" min={0} max={100} value={setting.value} disabled={!crtEnabled} onChange={(event) => setting.setValue(Number(event.target.value))} />
                  </label>
                ))}
              </section>
            )}

            {step === 4 && (
              <section className="oobe-page">
                <div className="oobe-heading">
                  <Check className="h-5 w-5" />
                  <div><h1>Ready</h1><p>Your desktop is configured.</p></div>
                </div>
                <dl className="oobe-summary">
                  <div><dt>Theme</dt><dd>{THEMES[theme].name}</dd></div>
                  <div><dt>Color mode</dt><dd>{THEMES[theme].schemes.length > 1 ? (appearance === "system" ? "Automatic" : appearance) : "Original palette"}</dd></div>
                  <div><dt>Cursor cat</dt><dd>{onekoEnabled ? `${onekoVariant === "dark" ? "Black" : "White"}, speed ${onekoSpeed}` : "Off"}</dd></div>
                  <div><dt>CRT effect</dt><dd>{crtEnabled ? "Custom" : "Off"}</dd></div>
                </dl>
              </section>
            )}
          </main>
        </div>

        <footer className="oobe-footer">
          <RetroButton onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</RetroButton>
          <span>{STEPS[step]}</span>
          <RetroButton variant="primary" onClick={() => step === STEPS.length - 1 ? finish() : setStep((current) => current + 1)}>
            {step === STEPS.length - 1 ? "Finish" : "Continue"}
          </RetroButton>
        </footer>
      </div>
    </div>
  );
};
