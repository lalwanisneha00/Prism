"use client";

import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { isWidgetId, widgetRegistry } from "@/visuals/registry";
import { AcWave } from "@/visuals/widgets/AcWave";
import { Capacitor } from "@/visuals/widgets/Capacitor";
import { CoulombForce } from "@/visuals/widgets/CoulombForce";
import { DcCircuit } from "@/visuals/widgets/DcCircuit";
import { FaradayInduction } from "@/visuals/widgets/FaradayInduction";
import { FieldLines } from "@/visuals/widgets/FieldLines";
import { GaussSurface } from "@/visuals/widgets/GaussSurface";
import { WireField } from "@/visuals/widgets/WireField";

/** Draws a registry widget after checking its parameters; anything invalid becomes a key-idea card. */
export function WidgetView({
  widget,
  params,
  caption,
}: {
  widget: string;
  params: unknown;
  caption: string;
}) {
  if (!isWidgetId(widget)) return <KeyIdeaCard caption={caption} />;

  switch (widget) {
    case "field-lines": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <FieldLines {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "coulomb-force": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <CoulombForce {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "gauss-surface": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <GaussSurface {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "capacitor": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <Capacitor {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "wire-field": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <WireField {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "faraday-induction": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <FaradayInduction {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "dc-circuit": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <DcCircuit {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
    case "ac-wave": {
      const p = widgetRegistry[widget].params.safeParse(params);
      return p.success ? (
        <AcWave {...p.data} caption={caption} />
      ) : (
        <KeyIdeaCard caption={caption} />
      );
    }
  }
}
