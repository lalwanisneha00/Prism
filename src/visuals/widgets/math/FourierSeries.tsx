"use client";

import { useState } from "react";
import { waves, type Wave } from "@/visuals/mathTools";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";

const order: Wave[] = ["square", "sawtooth", "triangle"];

/** Build a wave from sines and cosines: each extra term sharpens the approximation. */
export function FourierSeries({
  wave: startWave,
  terms: startTerms,
  caption,
}: {
  wave: Wave;
  terms: number;
  caption: string;
}) {
  const [wave, setWave] = useState(startWave);
  const [terms, setTerms] = useState(startTerms);
  const { label, f, partial } = waves[wave];
  const scale = makeGraphScale({
    xMin: -2 * Math.PI,
    xMax: 2 * Math.PI,
    yMin: wave === "triangle" ? -0.5 : wave === "square" ? -1.6 : -4,
    yMax: wave === "triangle" ? 3.8 : wave === "square" ? 1.6 : 4,
  });
  // Gibbs: the overshoot next to a jump never shrinks below about 9% of the jump.
  const overshoot =
    wave === "triangle"
      ? null
      : Math.max(
          ...Array.from({ length: 400 }, (_, i) => partial(0.0005 + (i / 400) * 1.5, terms)),
        );

  return (
    <WidgetShell
      title="Fourier series"
      caption={caption}
      readouts={
        <>
          <Readout label="Wave" value={label} />
          <Readout label="Terms used" value={String(terms)} />
          {overshoot !== null && (
            <Readout label="Peak near the jump" value={overshoot.toFixed(3)} />
          )}
        </>
      }
      controls={
        <>
          <Slider
            label="Number of terms"
            value={terms}
            min={1}
            max={40}
            step={1}
            unit=""
            onChange={setTerms}
          />
          <div className="flex flex-wrap items-center gap-2">
            {order.map((w) => (
              <WidgetButton key={w} onClick={() => setWave(w)}>
                {w === wave ? `● ${w}` : w}
              </WidgetButton>
            ))}
          </div>
        </>
      }
    >
      <Graph scale={scale} label={`${label} and its Fourier partial sum with ${terms} terms`}>
        <Curve scale={scale} f={f} color="var(--muted)" width={3} />
        <Curve scale={scale} f={(x) => partial(x, terms)} color="var(--primary)" width={2.5} />
      </Graph>
      <Legend
        items={[
          { color: "var(--muted)", label: label },
          { color: "var(--primary)", label: `Sum of the first ${terms} terms` },
        ]}
      />
    </WidgetShell>
  );
}
