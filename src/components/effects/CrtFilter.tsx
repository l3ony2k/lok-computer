import { useEffect, useRef } from 'react';

interface CrtFilterProps {
    rgbOffset: number; // 0-100
}

/**
 * SVG filter for CRT RGB chromatic aberration effect.
 * This is rendered as a hidden SVG and the filter is applied via CSS.
 */
export const CrtFilter = ({ rgbOffset }: CrtFilterProps) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Calculate pixel offset based on intensity (0-100 maps to 0-3px)
    const offset = (rgbOffset / 100) * 3;

    useEffect(() => {
        // Update the filter when intensity changes
        if (svgRef.current) {
            const redOffset = svgRef.current.querySelector('#crt-red-offset');
            const cyanOffset = svgRef.current.querySelector('#crt-cyan-offset');

            if (redOffset) {
                redOffset.setAttribute('dx', String(-offset));
            }
            if (cyanOffset) {
                cyanOffset.setAttribute('dx', String(offset));
            }
        }
    }, [offset]);

    return (
        <svg
            ref={svgRef}
            style={{
                position: 'absolute',
                width: 0,
                height: 0,
                overflow: 'hidden',
            }}
            aria-hidden="true"
        >
            <defs>
                <filter id="crt-rgb-filter" colorInterpolationFilters="sRGB">
                    {/* Extract and offset red channel */}
                    <feColorMatrix
                        in="SourceGraphic"
                        type="matrix"
                        values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
                        result="red"
                    />
                    <feOffset id="crt-red-offset" in="red" dx={-offset} dy="0" result="redOffset" />

                    {/* Extract green channel (no offset) */}
                    <feColorMatrix
                        in="SourceGraphic"
                        type="matrix"
                        values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
                        result="green"
                    />

                    {/* Extract and offset blue channel (opposite direction) */}
                    <feColorMatrix
                        in="SourceGraphic"
                        type="matrix"
                        values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
                        result="blue"
                    />
                    <feOffset id="crt-cyan-offset" in="blue" dx={offset} dy="0" result="blueOffset" />

                    {/* Combine all channels */}
                    <feBlend mode="screen" in="redOffset" in2="green" result="redGreen" />
                    <feBlend mode="screen" in="redGreen" in2="blueOffset" result="final" />
                </filter>
            </defs>
        </svg>
    );
};

export default CrtFilter;
