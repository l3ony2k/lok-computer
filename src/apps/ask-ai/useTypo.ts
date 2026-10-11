import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Typo effect hook - creates a natural typing animation with occasional typos
 * Adapted from https://neatnik.net/typo
 */

// Keyboard proximity map for realistic typos
const typos: Record<string, string[]> = {
    q: ['w', 'a'],
    w: ['q', 'r', 's'],
    e: ['w', 'd', 'r'],
    r: ['e', 'f', 't'],
    t: ['r', 'g', 'y'],
    y: ['t', 'h', 'u'],
    u: ['y', 'j', 'i'],
    i: ['u', 'k', 'o'],
    o: ['i', 'l', 'p'],
    p: ['o', ';', '['],
    a: ['q', 's', 'z'],
    s: ['w', 'a', 'x', 'd'],
    d: ['e', 's', 'c', 'f'],
    f: ['r', 'd', 'v', 'g'],
    g: ['t', 'f', 'b', 'h'],
    h: ['y', 'g', 'n', 'j'],
    j: ['u', 'h', 'm', 'k'],
    k: ['i', 'j', ',', 'l'],
    l: ['o', 'k', '.', ';'],
    z: ['a', 'x'],
    x: ['z', 's', 'c'],
    c: ['x', 'd', 'v'],
    v: ['c', 'f', 'b'],
    b: ['v', 'g', 'n'],
    n: ['b', 'h', 'm'],
    m: ['n', 'j', ','],
};

interface TypoOptions {
    speed?: number;      // Base typing speed in ms (default: 40)
    jitter?: number;     // Random jitter in ms (default: 20)
    typoChance?: number; // Chance of typo in % (default: 5)
}

const numBetween = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + min);

const chance = (val: number) => numBetween(0, 100) < val;

export const useTypo = (
    fullText: string,
    isActive: boolean,
    options: TypoOptions = {}
) => {
    const {
        speed = 40,
        jitter = 20,
        typoChance = 5,
    } = options;

    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const abortRef = useRef(false);
    const hasTypedRef = useRef(false);

    const typeText = useCallback(async () => {
        if (!isActive || hasTypedRef.current) return;

        hasTypedRef.current = true;
        setIsTyping(true);
        abortRef.current = false;

        let buffer = '';
        let typoActive = false;
        let realizationDelayCounter = 0;
        let seed = 0;

        for (let i = 0; i < fullText.length; i++) {
            if (abortRef.current) {
                setDisplayText(fullText);
                setIsTyping(false);
                return;
            }

            const letter = fullText.charAt(i);
            const lowerLetter = letter.toLowerCase();

            // Trigger a typo
            if (chance(typoChance) && !typoActive && i > 1) {
                if (typos[lowerLetter] !== undefined) {
                    // Swap the letter with a random typo
                    const typoLetter = typos[lowerLetter][Math.floor(Math.random() * typos[lowerLetter].length)];
                    // Preserve case
                    const finalTypo = letter === letter.toUpperCase() ? typoLetter.toUpperCase() : typoLetter;

                    buffer = buffer + finalTypo;
                    setDisplayText(buffer);

                    typoActive = true;
                    seed = numBetween(2, 5);
                    realizationDelayCounter = seed;
                }
            }

            // Append the letter to the buffer
            buffer = buffer + letter;
            setDisplayText(buffer);

            // Typical typing speed with jitter
            const speedLower = speed - jitter;
            const speedUpper = speed + jitter;
            let delay = numBetween(speedLower, speedUpper);

            // Chance of longer delay (thinking pause)
            if (chance(5)) delay = numBetween(100, 200);

            await new Promise(resolve => setTimeout(resolve, delay));

            if (typoActive) {
                realizationDelayCounter--;
                if (realizationDelayCounter === 0) {
                    // Pause at realization of typo
                    for (let k = 0; k < seed + 1; k++) {
                        await new Promise(resolve => setTimeout(resolve, jitter));
                        // Rewind the buffer!
                        buffer = buffer.substring(0, buffer.length - 1);
                        setDisplayText(buffer);
                        // Brief pause before continuing
                        await new Promise(resolve => setTimeout(resolve, 30));
                    }
                    typoActive = false;
                    // Go back in the text
                    i = i - seed;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        setIsTyping(false);
    }, [fullText, isActive, speed, jitter, typoChance]);

    useEffect(() => {
        if (isActive && !hasTypedRef.current) {
            typeText();
        }

        return () => {
            abortRef.current = true;
        };
    }, [isActive, typeText]);

    // Reset when fullText changes
    useEffect(() => {
        hasTypedRef.current = false;
        setDisplayText('');
    }, [fullText]);

    // If not active, just show the full text
    if (!isActive) {
        return { displayText: fullText, isTyping: false };
    }

    return { displayText, isTyping };
};
