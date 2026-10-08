import { useEffect, useRef } from 'react';

interface SpectrumAnalyzerProps {
  analyser: AnalyserNode | null;
  playing: boolean;
}

const BAR_COUNT = 28;
const SEGMENTS = 16;
const PEAK_FALL_PER_FRAME = 0.012;

/**
 * Segmented spectrum display in the style of a hardware LED analyzer.
 *
 * Colors come from the stage's CSS tokens so every theme restyles it. The
 * animation loop only runs while audio plays or bars are still settling.
 */
export const SpectrumAnalyzer = ({ analyser, playing }: SpectrumAnalyzerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef(new Float32Array(BAR_COUNT));
  const peaksRef = useRef(new Float32Array(BAR_COUNT));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let frame = 0;
    let colors = { fg: '#e8e8e8', accent: '#e8e8e8' };
    let frameCount = 0;
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const readColors = () => {
      const style = getComputedStyle(canvas);
      colors = {
        fg: style.getPropertyValue('--media-stage-fg').trim() || colors.fg,
        accent: style.getPropertyValue('--media-accent').trim() || colors.accent,
      };
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const sample = () => {
      const levels = levelsRef.current;
      if (!analyser || !bins || !playing) {
        for (let i = 0; i < BAR_COUNT; i += 1) levels[i] *= 0.86;
        return;
      }
      analyser.getByteFrequencyData(bins);
      // Log-spaced bands so bass does not swallow the display.
      const usable = bins.length * 0.72;
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const start = Math.floor(Math.pow(usable, i / BAR_COUNT));
        const end = Math.max(start + 1, Math.floor(Math.pow(usable, (i + 1) / BAR_COUNT)));
        let sum = 0;
        for (let bin = start; bin < end; bin += 1) sum += bins[bin];
        const value = sum / (end - start) / 255;
        levels[i] = Math.max(value, levels[i] * 0.8);
      }
    };

    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      if (frameCount % 30 === 0) readColors();
      frameCount += 1;

      const levels = levelsRef.current;
      const peaks = peaksRef.current;
      const padding = Math.max(10, width * 0.04);
      const bottom = height - Math.max(34, height * 0.16);
      const top = Math.max(14, height * 0.1);
      const usableHeight = Math.max(10, bottom - top);
      const gap = 3;
      const barWidth = Math.max(2, (width - padding * 2 - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      const segmentHeight = usableHeight / SEGMENTS;
      let active = false;

      for (let i = 0; i < BAR_COUNT; i += 1) {
        const level = levels[i];
        const lit = Math.round(level * SEGMENTS);
        const x = padding + i * (barWidth + gap);
        if (level > 0.01) active = true;

        for (let segment = 0; segment < SEGMENTS; segment += 1) {
          const y = bottom - (segment + 1) * segmentHeight;
          context.globalAlpha = segment < lit ? 1 : 0.1;
          context.fillStyle = segment >= SEGMENTS - 3 && segment < lit ? colors.accent : colors.fg;
          context.fillRect(x, y + 1, barWidth, Math.max(1, segmentHeight - 2));
        }

        peaks[i] = Math.max(level, peaks[i] - PEAK_FALL_PER_FRAME);
        if (peaks[i] > 0.02) {
          active = true;
          const peakY = bottom - Math.ceil(peaks[i] * SEGMENTS) * segmentHeight;
          context.globalAlpha = 0.9;
          context.fillStyle = colors.fg;
          context.fillRect(x, peakY - 1, barWidth, 2);
        }
      }
      context.globalAlpha = 1;
      return active;
    };

    const tick = () => {
      sample();
      const active = draw();
      if (playing || active) frame = requestAnimationFrame(tick);
    };

    readColors();
    resize();
    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [analyser, playing]);

  return <canvas ref={canvasRef} className="media-player-spectrum" aria-hidden="true" />;
};
