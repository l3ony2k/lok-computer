import { useWindowState } from '@/hooks/useWindowManager';
import { DraggableWindow } from './DraggableWindow';
import { useWindowTransitions } from '@/hooks/useWindowTransitions';

export const WindowContainer = () => {
  const { windows, activeWindow } = useWindowState();
  const { isWindowTransitioning } = useWindowTransitions();

  return (
    <div className="window-layer h-full w-full relative">
      {windows.map((window) => (
        <DraggableWindow
          key={window.id}
          window={window}
          isActive={activeWindow === window.id}
          isTransitioning={isWindowTransitioning(window.id)}
        />
      ))}
    </div>
  );
};
