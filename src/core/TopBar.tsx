import React from 'react';
import { SystemClock, SystemMenuButton } from './SystemMenu';

/** Top bar for the lok layout; classic layouts move these controls into the taskbar. */
export const TopBar: React.FC = React.memo(() => (
  <div className="app-header h-[35px] text-sm flex items-center select-none">
    <div className="flex items-center">
      <SystemMenuButton placement="top" />
    </div>

    <div className="ml-auto flex items-center gap-2 text-sm select-none">
      <SystemClock placement="top" />
    </div>
  </div>
));
