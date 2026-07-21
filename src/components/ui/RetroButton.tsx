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
                    size === 'sm' && "text-sm",
                    size === 'md' && "text-sm",
                    size === 'icon' && "p-1",
                    active && "bg-accent",
                    variant === 'primary' && "font-bold",
                    className
                )}
                data-active={active || undefined}
                data-variant={variant}
                {...props}
            />
        );
    }
);

RetroButton.displayName = "RetroButton";
