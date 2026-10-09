import React from 'react';
import { cn } from "@/lib/utils";

interface WindowLayoutProps {
    toolbar?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    /** If true, the content area will be scrollable. Default: true */
    isScrollable?: boolean;
    /** If true, applies the standard padding to the content area. Default: true */
    hasPadding?: boolean;
}

/**
 * Standardized window layout: Toolbar (Top) + Content (Middle) + Footer (Bottom).
 */
export const WindowLayout = ({
    toolbar,
    footer,
    children,
    className,
    isScrollable = true,
    hasPadding = true
}: WindowLayoutProps) => {
    return (
        <div className={cn("app-window-layout flex flex-col h-full min-h-0 select-none", className)}>
            {toolbar && <div className="window-toolbar">{toolbar}</div>}

            {/* `relative` makes the scroller the containing block for absolutely
                positioned descendants (sr-only text, popovers); otherwise they
                anchor to the window body and give it a second scrollbar. */}
            <div className={cn(
                "window-content-area relative flex-1 min-h-0",
                isScrollable && "overflow-auto scrollable-area",
                hasPadding && "p-2"
            )}>
                {children}
            </div>

            {footer && <div className="window-footer">{footer}</div>}
        </div>
    );
};
