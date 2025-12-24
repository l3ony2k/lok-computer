import { useEffect, useRef } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import onekoDefault from '@/assets/oneko.gif';
import onekoDark from '@/assets/oneko-dark.gif';

const spriteSets: Record<string, number[][]> = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
        [-5, 0],
        [-6, 0],
        [-7, 0],
    ],
    scratchWallN: [
        [0, 0],
        [0, -1],
    ],
    scratchWallS: [
        [-7, -1],
        [-6, -2],
    ],
    scratchWallE: [
        [-2, -2],
        [-2, -3],
    ],
    scratchWallW: [
        [-4, 0],
        [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
        [-2, 0],
        [-2, -1],
    ],
    N: [
        [-1, -2],
        [-1, -3],
    ],
    NE: [
        [0, -2],
        [0, -3],
    ],
    E: [
        [-3, 0],
        [-3, -1],
    ],
    SE: [
        [-5, -1],
        [-5, -2],
    ],
    S: [
        [-6, -3],
        [-7, -2],
    ],
    SW: [
        [-5, -3],
        [-6, -1],
    ],
    W: [
        [-4, -2],
        [-4, -3],
    ],
    NW: [
        [-1, 0],
        [-1, -1],
    ],
};

export const Oneko: React.FC = () => {
    const { settings } = useUserSettings();
    const nekoRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const stateRef = useRef({
        nekoPosX: 32,
        nekoPosY: 32,
        mousePosX: 0,
        mousePosY: 0,
        frameCount: 0,
        idleTime: 0,
        idleAnimation: null as string | null,
        idleAnimationFrame: 0,
        lastFrameTimestamp: 0,
    });

    // Check if oneko is enabled and should render
    const isEnabled = settings.oneko?.enabled ?? false;
    const speed = settings.oneko?.speed ?? 10;
    const variant = settings.oneko?.variant ?? 'default';

    // Check for reduced motion preference
    const isReducedMotion =
        typeof window !== 'undefined' &&
        (window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        if (!isEnabled || isReducedMotion || !nekoRef.current) return;

        const nekoEl = nekoRef.current;
        const state = stateRef.current;

        const setSprite = (name: string, frame: number) => {
            const spriteSet = spriteSets[name];
            if (!spriteSet) return;
            const sprite = spriteSet[frame % spriteSet.length];
            nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
        };

        const resetIdleAnimation = () => {
            state.idleAnimation = null;
            state.idleAnimationFrame = 0;
        };

        const idle = () => {
            state.idleTime += 1;

            if (
                state.idleTime > 10 &&
                Math.floor(Math.random() * 200) === 0 &&
                state.idleAnimation === null
            ) {
                const availableIdleAnimations = ['sleeping', 'scratchSelf'];
                if (state.nekoPosX < 32) {
                    availableIdleAnimations.push('scratchWallW');
                }
                if (state.nekoPosY < 32) {
                    availableIdleAnimations.push('scratchWallN');
                }
                if (state.nekoPosX > window.innerWidth - 32) {
                    availableIdleAnimations.push('scratchWallE');
                }
                if (state.nekoPosY > window.innerHeight - 32) {
                    availableIdleAnimations.push('scratchWallS');
                }
                state.idleAnimation =
                    availableIdleAnimations[
                    Math.floor(Math.random() * availableIdleAnimations.length)
                    ];
            }

            switch (state.idleAnimation) {
                case 'sleeping':
                    if (state.idleAnimationFrame < 8) {
                        setSprite('tired', 0);
                        break;
                    }
                    setSprite('sleeping', Math.floor(state.idleAnimationFrame / 4));
                    if (state.idleAnimationFrame > 192) {
                        resetIdleAnimation();
                    }
                    break;
                case 'scratchWallN':
                case 'scratchWallS':
                case 'scratchWallE':
                case 'scratchWallW':
                case 'scratchSelf':
                    setSprite(state.idleAnimation, state.idleAnimationFrame);
                    if (state.idleAnimationFrame > 9) {
                        resetIdleAnimation();
                    }
                    break;
                default:
                    setSprite('idle', 0);
                    return;
            }
            state.idleAnimationFrame += 1;
        };

        const frame = () => {
            state.frameCount += 1;
            const diffX = state.nekoPosX - state.mousePosX;
            const diffY = state.nekoPosY - state.mousePosY;
            const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

            if (distance < speed || distance < 48) {
                idle();
                return;
            }

            state.idleAnimation = null;
            state.idleAnimationFrame = 0;

            if (state.idleTime > 1) {
                setSprite('alert', 0);
                state.idleTime = Math.min(state.idleTime, 7);
                state.idleTime -= 1;
                return;
            }

            let direction = '';
            direction = diffY / distance > 0.5 ? 'N' : '';
            direction += diffY / distance < -0.5 ? 'S' : '';
            direction += diffX / distance > 0.5 ? 'W' : '';
            direction += diffX / distance < -0.5 ? 'E' : '';
            if (direction) {
                setSprite(direction, state.frameCount);
            }

            state.nekoPosX -= (diffX / distance) * speed;
            state.nekoPosY -= (diffY / distance) * speed;

            state.nekoPosX = Math.min(Math.max(16, state.nekoPosX), window.innerWidth - 16);
            state.nekoPosY = Math.min(Math.max(16, state.nekoPosY), window.innerHeight - 16);

            nekoEl.style.left = `${state.nekoPosX - 16}px`;
            nekoEl.style.top = `${state.nekoPosY - 16}px`;
        };

        const onAnimationFrame = (timestamp: number) => {
            if (!nekoEl.isConnected) {
                return;
            }
            if (!state.lastFrameTimestamp) {
                state.lastFrameTimestamp = timestamp;
            }
            if (timestamp - state.lastFrameTimestamp > 100) {
                state.lastFrameTimestamp = timestamp;
                frame();
            }
            animationRef.current = window.requestAnimationFrame(onAnimationFrame);
        };

        const handleMouseMove = (event: MouseEvent) => {
            state.mousePosX = event.clientX;
            state.mousePosY = event.clientY;
        };

        document.addEventListener('mousemove', handleMouseMove);
        animationRef.current = window.requestAnimationFrame(onAnimationFrame);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            if (animationRef.current !== null) {
                window.cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isEnabled, isReducedMotion, speed]);

    if (!isEnabled || isReducedMotion) return null;

    const nekoFile = variant === 'dark' ? onekoDark : onekoDefault;

    return (
        <div
            ref={nekoRef}
            id="oneko"
            aria-hidden="true"
            style={{
                width: 32,
                height: 32,
                position: 'fixed',
                imageRendering: 'pixelated',
                left: 16,
                top: 16,
                zIndex: 2147483647,
                backgroundImage: `url(${nekoFile})`,
                pointerEvents: 'none',
            }}
        />
    );
};

export default Oneko;
