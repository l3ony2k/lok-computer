import React from "react";
import { cn } from "@/lib/utils";

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    size?: 'sm' | 'md' | 'icon';
    active?: boolean;
    variant?: 'default' | 'primary';
}

export const RetroButton = React.forwardRef<HTMLButtonElement, RetroButtonProps>(
    ({ className, size = 'md', active, variant = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "retro-button flex items-center justify-center",
                    size === 'sm' && "text-xs px-1 h-[18px]",
                    size === 'md' && "px-2 py-1 text-sm",
                    size === 'icon' && "p-1",
                    active && "bg-accent",
                    variant === 'primary' && "font-bold",
                    className
                )}
                {...props}
            />
        );
    }
);

RetroButton.displayName = "RetroButton";
