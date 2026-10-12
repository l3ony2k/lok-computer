import { useEffect, type RefObject } from 'react';

/**
 * Lets a mouse wheel scroll a horizontal strip (the taskbar's tasks, the Palm
 * tab bar): vertical wheel motion becomes horizontal scrolling, as a desktop
 * user over a one-line strip expects.
 */
export const useWheelScroll = (ref: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      element.scrollLeft += event.deltaY + event.deltaX;
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [ref]);
};
