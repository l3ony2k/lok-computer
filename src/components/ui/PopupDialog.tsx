import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomIcon } from '@/components/window/CustomIcon';
import { cn } from '@/lib/utils';
import { RetroButton } from '@/components/ui/RetroButton';

interface PopupDialogProps {
    title: string;
    iconType?: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
    height?: number;
    className?: string;
    /**
     * If true, shows dimmed overlay, prevents interaction with other windows,
     * clicking outside does NOT dismiss. User must interact with the dialog.
     * If false (default), no overlay, draggable, can interact with other windows.
     */
    intrusive?: boolean;
    /**
     * Initial position for non-intrusive dialogs
     */
    initialPosition?: { x: number; y: number };
}

/**
 * Reusable popup dialog that matches the existing window style.
 * Only shows close button (no minimize/maximize).
 * Close button acts as cancel.
 * 
 * Two modes:
 * - intrusive: dimmed overlay, must interact with dialog to continue
 * - non-intrusive (default): draggable, can interact with other windows
 */
export const PopupDialog: React.FC<PopupDialogProps> = ({
    title,
    iconType = 'config',
    isOpen,
    onClose,
    children,
    width = 320,
    height,
    className,
    intrusive = false,
    initialPosition,
}) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Center the dialog on first open
    useEffect(() => {
        if (isOpen && !position) {
            if (initialPosition) {
                setPosition(initialPosition);
            } else {
                // Center in viewport
                const x = (window.innerWidth - width) / 2;
                const y = (window.innerHeight - (height ?? 200)) / 2;
                setPosition({ x, y });
            }
        }
    }, [isOpen, position, initialPosition, width, height]);

    // Reset position when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setPosition(null);
        }
    }, [isOpen]);

    // Handle drag for non-intrusive mode
    const handleMouseDown = (e: React.MouseEvent) => {
        if (intrusive) return;
        if (!dialogRef.current) return;

        const rect = dialogRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        setIsDragging(true);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!isOpen) return null;

    const dialogStyle: React.CSSProperties = {
        width,
        height: height ?? 'auto',
        maxHeight: '80vh',
        ...(position && !intrusive ? {
            position: 'fixed',
            left: position.x,
            top: position.y,
        } : {}),
    };

    const dialogContent = (
        <div
            ref={dialogRef}
            className={cn(
                "window-surface flex flex-col overflow-hidden",
                intrusive ? "relative" : "fixed z-[2147483646]",
                className
            )}
            style={dialogStyle}
        >
            {/* Title bar - matches DraggableWindow exactly */}
            <div
                className={cn(
                    "window-titlebar",
                    !intrusive && "cursor-move"
                )}
                onMouseDown={handleMouseDown}
            >
                <CustomIcon iconType={iconType} className="mr-1 w-4 h-4" />
                <span className="flex-1 truncate">{title}</span>
                <div className="flex gap-1">
                    <button
                        className="retro-button window-control"
                        onClick={onClose}
                        title="Close"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Content area with default styling */}
            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-4 text-sm">
                    {children}
                </div>
            </div>
        </div>
    );

    if (intrusive) {
        return (
            <div className="fixed inset-0 z-[2147483646] flex items-center justify-center">
                {/* Backdrop - does NOT dismiss on click for intrusive mode */}
                <div className="absolute inset-0 bg-black/30" />
                {dialogContent}
            </div>
        );
    }

    // Non-intrusive: just render the dialog directly
    return dialogContent;
};

/**
 * Default button layout for popup dialogs
 */
export const PopupDialogButtons: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => (
    <div className="flex justify-center gap-2">
        {children}
    </div>
);

export default PopupDialog;
