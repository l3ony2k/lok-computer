import React from 'react';
import { cn } from '@/lib/utils';

interface StateMessageProps {
    children: React.ReactNode;
    /** Height of the container. Defaults to 'h-full'. Use 'h-48' for grid areas. */
    minHeight?: string;
    /** Additional className for customization */
    className?: string;
}

/**
 * A unified component for displaying loading, empty, and error state messages.
 * Provides consistent styling across all apps.
 * 
 * @example
 * // Full height (default)
 * <StateMessage>Loading...</StateMessage>
 * 
 * // Fixed height for grid areas
 * <StateMessage minHeight="h-48">Loading items...</StateMessage>
 */
export const StateMessage: React.FC<StateMessageProps> = ({
    children,
    minHeight = 'h-full',
    className,
}) => {
    return (
        <div
            className={cn(
                'flex items-center justify-center',
                'state-message text-sm',
                'p-4 text-center',
                minHeight,
                className
            )}
        >
            {children}
        </div>
    );
};

export default StateMessage;
