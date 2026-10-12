import { useEffect, type RefObject } from 'react';

/**
 * Marks a horizontally scrolling strip with `data-scroll-fade` ("left",
 * "right" or "both") while content continues past an edge, so the stylesheet
 * can fade that edge instead of cutting the content off (the taskbar's tasks,
 * the Palm tab bar). Updates on scroll, on resize, and whenever the strip's
 * children change.
 */
const SLACK = 4;

export const useScrollFade = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // A few pixels of slack: a strip scrolled to its end can stop short by its own padding.
    const update = () => {
      const left = element.scrollLeft > SLACK;
      const right = element.scrollLeft + element.clientWidth < element.scrollWidth - SLACK;
      const fade = left && right ? 'both' : left ? 'left' : right ? 'right' : null;
      if (fade) element.dataset.scrollFade = fade;
      else delete element.dataset.scrollFade;
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(element);
    const children = new MutationObserver(update);
    children.observe(element, { childList: true, subtree: true, characterData: true });
    return () => {
      element.removeEventListener('scroll', update);
      resize.disconnect();
      children.disconnect();
    };
  }, [ref]);
};
