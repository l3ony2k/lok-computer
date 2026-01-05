import { useTypo } from './useTypo';

interface TypoTextProps {
    text: string;
    isNew?: boolean; // Only animate newly added messages
    speed?: number;
    jitter?: number;
    typoChance?: number;
}

/**
 * A component that displays text with a natural typing effect,
 * including occasional typos that get corrected.
 */
export const TypoText = ({
    text,
    isNew = false,
    speed = 35,
    jitter = 15,
    typoChance = 4,
}: TypoTextProps) => {
    const { displayText, isTyping } = useTypo(text, isNew, {
        speed,
        jitter,
        typoChance,
    });

    return (
        <span>
            {displayText}
            {isTyping && <span className="animate-pulse">▌</span>}
        </span>
    );
};
