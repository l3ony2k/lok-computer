/**
 * Tracks whether the person is driving the page with the keyboard or a
 * pointer, as `html[data-input="keyboard" | "pointer"]`. Browsers match
 * `:focus-visible` on text fields even after a click, which drew a focus
 * ring over a field the person had just tapped; the stylesheet keeps the ring
 * on fields for keyboard focus only (Tab and the arrow keys switch the mode,
 * any pointer press switches it back). Buttons keep the browser heuristic.
 */
const NAVIGATION_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export type InputModality = 'keyboard' | 'pointer';

const setModality = (modality: InputModality) => {
  const root = document.documentElement;
  if (root.dataset.input !== modality) root.dataset.input = modality;
};

export const installInputModality = () => {
  setModality('pointer');
  window.addEventListener('keydown', (event) => {
    if (NAVIGATION_KEYS.has(event.key)) setModality('keyboard');
  }, true);
  window.addEventListener('pointerdown', () => setModality('pointer'), true);
};
