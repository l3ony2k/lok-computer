import { useState } from "react";
import { Cat, Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { CustomIcon } from "@/components/window/CustomIcon";
import { RetroButton } from "@/components/ui/RetroButton";

type ThemeChoice = "light" | "dark" | "system";

export interface OobeSelection {
  theme: ThemeChoice;
  onekoEnabled: boolean;
  crtEnabled: boolean;
}

interface OutOfBoxExperienceProps {
  isOpen: boolean;
  initialOnekoEnabled?: boolean;
  initialCrtEnabled?: boolean;
  onComplete: (selection: OobeSelection) => void;
}

const STEPS = ["Welcome", "Appearance", "Cursor cat", "Display", "Ready"];

export const OutOfBoxExperience = ({
  isOpen,
  initialOnekoEnabled = false,
  initialCrtEnabled = false,
  onComplete,
}: OutOfBoxExperienceProps) => {
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<ThemeChoice>(() => (
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system"
  ));
  const [onekoEnabled, setOnekoEnabled] = useState(initialOnekoEnabled);
  const [crtEnabled, setCrtEnabled] = useState(initialCrtEnabled);

  if (!isOpen) return null;

  const chooseTheme = (value: ThemeChoice) => {
    setSelectedTheme(value);
    setTheme(value);
  };

  const finish = () => onComplete({
    theme: selectedTheme,
    onekoEnabled,
    crtEnabled,
  });

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
                <div className="oobe-page-icon"><CustomIcon iconType="config" className="h-12 w-12" /></div>
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
                  <div><h1>Appearance</h1><p>Choose a color mode.</p></div>
                </div>
                <div className="oobe-choice-grid oobe-theme-choices">
                  {([
                    { value: "light" as const, label: "Light", icon: Sun },
                    { value: "dark" as const, label: "Dark", icon: Moon },
                    { value: "system" as const, label: "Automatic", icon: Monitor },
                  ]).map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" className="oobe-choice" data-active={selectedTheme === value || undefined} onClick={() => chooseTheme(value)}>
                      <Icon className="h-5 w-5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
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
              </section>
            )}

            {step === 4 && (
              <section className="oobe-page">
                <div className="oobe-heading">
                  <Check className="h-5 w-5" />
                  <div><h1>Ready</h1><p>Your desktop is configured.</p></div>
                </div>
                <dl className="oobe-summary">
                  <div><dt>Theme</dt><dd>{selectedTheme === "system" ? "Automatic" : selectedTheme}</dd></div>
                  <div><dt>Cursor cat</dt><dd>{onekoEnabled ? "On" : "Off"}</dd></div>
                  <div><dt>CRT effect</dt><dd>{crtEnabled ? "On" : "Off"}</dd></div>
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
