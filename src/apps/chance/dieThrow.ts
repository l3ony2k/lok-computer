/**
 * Throwing dice (DieView): the cube's orientation for each value, and the
 * Web Animations that fly every die in from a point, tumble it and land it.
 */

/** The cube's turn that brings each value to the front (see the face placement in chance.css). */
const CUBE_TURN: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

/** Before the first roll the cube rests face-on like every other die, a "?" on its front. */
export const cubeTurn = (value: number | null) => (value ? CUBE_TURN[value] : CUBE_TURN[1]);

export const cubeTransform = (value: number | null) => {
  const { x, y } = cubeTurn(value);
  return `rotateX(${x}deg) rotateY(${y}deg) rotateZ(0deg)`;
};

export const THROW_MS = 760;
export const THROW_STAGGER_MS = 55;
/** Share of the throw at which a die first touches down. */
export const LAND_AT = 0.68;

const random = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Throws the dice already laid out in `container` (one .chance-die-slot each)
 * from the centre of `from`: each flies in small, tumbles, lands, bounces once
 * and settles on `finals`. Returns when the last die has settled.
 */
export const throwDice = (container: HTMLElement, from: DOMRect, sides: readonly number[], finals: readonly number[]) => {
  const slots = Array.from(container.querySelectorAll<HTMLElement>('.chance-die-slot'));
  const animations: Animation[] = [];
  const fromX = from.left + from.width / 2;
  const fromY = from.top + from.height / 2;
  slots.forEach((slot, index) => {
    const rect = slot.getBoundingClientRect();
    const dx = fromX - (rect.left + rect.width / 2);
    const dy = fromY - (rect.top + rect.height / 2);
    const lift = -rect.height * 0.22;
    const timing = { duration: THROW_MS, delay: index * THROW_STAGGER_MS, fill: 'backwards' as const };

    const flight = slot.querySelector<HTMLElement>('.chance-die-throw');
    if (flight) animations.push(flight.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(0.45)`, opacity: 0, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
      { opacity: 1, offset: 0.12 },
      { transform: `translate(0, ${lift}px) scale(1.06)`, offset: LAND_AT * 0.62, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
      { transform: 'translate(0, 0) scale(1)', offset: LAND_AT, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      { transform: `translate(0, ${lift * 0.3}px) scale(1)`, offset: 0.84, easing: 'cubic-bezier(0.5, 0, 0.8, 0.5)' },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], timing));

    const shadow = slot.querySelector<HTMLElement>('.chance-die-shadow');
    if (shadow) animations.push(shadow.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
      { transform: 'translate(0, 0) scale(0.55)', opacity: 0.35, offset: LAND_AT * 0.62 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: LAND_AT },
      { transform: 'translate(0, 0) scale(0.8)', opacity: 0.7, offset: 0.84 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], timing));

    // Tumble: a few full turns that end exactly on the landing orientation.
    const body = slot.querySelector<HTMLElement>(sides[index] === 6 ? '.chance-cube' : '.chance-tile');
    if (body) {
      const end = sides[index] === 6 ? cubeTurn(finals[index]) : { x: 0, y: 0 };
      const turnsX = sides[index] === 6 ? 720 : 360;
      const start = {
        x: end.x - turnsX - (sides[index] === 6 ? 90 * Math.round(random(0, 3)) : 0),
        y: end.y + 360 * (Math.random() < 0.5 ? 1 : -1),
        z: random(-60, 60),
      };
      animations.push(body.animate([
        { transform: `rotateX(${start.x}deg) rotateY(${start.y}deg) rotateZ(${start.z}deg)`, easing: 'cubic-bezier(0.25, 0.5, 0.35, 1)' },
        { transform: `rotateX(${end.x}deg) rotateY(${end.y}deg) rotateZ(0deg)`, offset: LAND_AT + 0.08 },
        { transform: `rotateX(${end.x}deg) rotateY(${end.y}deg) rotateZ(0deg)` },
      ], timing));
    }
  });
  return Promise.allSettled(animations.map((animation) => animation.finished)).then(() => undefined);
};
