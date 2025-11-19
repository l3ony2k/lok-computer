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
        <div className={cn("flex flex-col h-full select-none", className)}>
            {toolbar}

            <div className={cn(
                "window-content-area flex-1",
                isScrollable && "overflow-auto scrollable-area",
                hasPadding && "p-2"
            )}>
                {children}
            </div>

            {footer}
        </div>
    );
};
