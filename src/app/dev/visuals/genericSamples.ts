import type { VisualSpec } from "@/lib/schema";

/** One example of every generic visual (SPEC §4.1), for checking by eye on /dev/visuals. */
export const genericSamples: { heading: string; visual: VisualSpec }[] = [
  {
    heading: "Chart · line",
    visual: {
      type: "chart",
      chart: "line",
      xLabel: "Time (s)",
      yLabel: "Speed (m/s)",
      categories: ["0", "1", "2", "3", "4", "5"],
      series: [
        { name: "Car A", values: [0, 4, 8, 12, 16, 20] },
        { name: "Car B", values: [0, 6, 10, 12, 13, 13.5] },
      ],
      data: "illustrative",
      caption: "Notice how car B speeds up fast at first, then levels off.",
    },
  },
  {
    heading: "Chart · area",
    visual: {
      type: "chart",
      chart: "area",
      xLabel: "Month",
      yLabel: "Savings (₹ thousand)",
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      series: [{ name: "Savings", values: [2, 4, 7, 9, 12, 16] }],
      data: "illustrative",
      caption: "Notice the area under the line growing faster each month.",
    },
  },
  {
    heading: "Chart · grouped bar",
    visual: {
      type: "chart",
      chart: "bar",
      xLabel: "Subject",
      yLabel: "Marks (out of 100)",
      categories: ["Maths", "Physics", "Chemistry"],
      series: [
        { name: "Mid-term", values: [62, 70, 58] },
        { name: "Final", values: [78, 74, 69] },
      ],
      data: "illustrative",
      caption: "Notice which subject improved the most between the two exams.",
    },
  },
  {
    heading: "Chart · stacked bar",
    visual: {
      type: "chart",
      chart: "stacked-bar",
      xLabel: "Day",
      yLabel: "Study time (hours)",
      categories: ["Mon", "Tue", "Wed", "Thu"],
      series: [
        { name: "Lectures", values: [2, 3, 1, 2] },
        { name: "Self-study", values: [1, 1.5, 3, 2] },
      ],
      data: "illustrative",
      caption: "Notice how the total stays similar while the mix changes.",
    },
  },
  {
    heading: "Chart · pie (percent, must add to 100)",
    visual: {
      type: "chart",
      chart: "pie",
      unit: "%",
      categories: ["Rent", "Food", "Travel", "Savings"],
      series: [{ name: "Budget", values: [40, 30, 10, 20] }],
      data: "illustrative",
      caption: "Notice rent takes the biggest share of the budget.",
    },
  },
  {
    heading: "Chart · donut",
    visual: {
      type: "chart",
      chart: "donut",
      categories: ["Correct", "Partly", "Wrong"],
      series: [{ name: "Answers", values: [14, 4, 2] }],
      data: "illustrative",
      caption: "Notice most answers were fully correct.",
    },
  },
  {
    heading: "Chart · scatter",
    visual: {
      type: "chart",
      chart: "scatter",
      xLabel: "Hours studied",
      yLabel: "Score (%)",
      scatter: [
        {
          name: "Students",
          points: [
            { x: 1, y: 42 },
            { x: 2, y: 50 },
            { x: 3, y: 61 },
            { x: 4, y: 58 },
            { x: 5, y: 72 },
            { x: 6, y: 80 },
            { x: 7, y: 77 },
          ],
        },
      ],
      data: "illustrative",
      caption: "Notice the upward trend: more hours, higher scores, with some scatter.",
    },
  },
  {
    heading: "Chart · histogram",
    visual: {
      type: "chart",
      chart: "histogram",
      xLabel: "Height (cm)",
      yLabel: "Number of students",
      bins: [
        { from: 150, to: 155, count: 2 },
        { from: 155, to: 160, count: 6 },
        { from: 160, to: 165, count: 11 },
        { from: 165, to: 170, count: 8 },
        { from: 170, to: 175, count: 3 },
      ],
      data: "illustrative",
      caption: "Notice the bars pile up in the middle and thin out at the edges.",
    },
  },
  {
    heading: "Chart · box plot",
    visual: {
      type: "chart",
      chart: "box",
      xLabel: "Section",
      yLabel: "Score (%)",
      boxes: [
        { name: "A", min: 35, q1: 52, median: 64, q3: 75, max: 92 },
        { name: "B", min: 48, q1: 58, median: 61, q3: 66, max: 80 },
      ],
      data: "illustrative",
      caption: "Notice section B's scores are bunched together; A's are spread out.",
    },
  },
  {
    heading: "Chart · radar",
    visual: {
      type: "chart",
      chart: "radar",
      categories: ["Theory", "Numericals", "Derivations", "Graphs", "Speed"],
      series: [{ name: "You", values: [7, 5, 6, 8, 4] }],
      data: "illustrative",
      caption: "Notice the dip at Speed: the area to practise next.",
    },
  },
  {
    heading: "Graph · area under a curve and a tangent",
    visual: {
      type: "graph",
      functions: [{ expression: "x^2", label: "y = x²" }],
      xRange: [-0.5, 2.5],
      xLabel: "x",
      yLabel: "y",
      shade: { index: 0, from: 0, to: 2 },
      tangent: { index: 0, x: 1.5 },
      points: [{ at: [1.5, 2.25], label: "P" }],
      caption: "Notice the shaded area is 8/3 and the tangent at P has slope 3.",
    },
  },
  {
    heading: "Graph · vectors (equal axes)",
    visual: {
      type: "graph",
      functions: [],
      xRange: [-4, 4],
      xLabel: "x",
      yLabel: "y",
      vectors: [
        { from: [0, 0], to: [3, 1], label: "a" },
        { from: [0, 0], to: [1, 2], label: "b" },
        { from: [0, 0], to: [4, 3], label: "a + b" },
      ],
      equalAspect: true,
      caption: "Notice a + b is the diagonal of the parallelogram made by a and b.",
    },
  },
  {
    heading: "Formula explorer · compound interest",
    visual: {
      type: "formula",
      formula: "P * (1 + r/100)^t",
      output: { label: "Amount", unit: "₹" },
      variables: [
        {
          name: "P",
          label: "Principal",
          unit: "₹",
          min: 1000,
          max: 100000,
          value: 10000,
          step: 1000,
        },
        {
          name: "r",
          label: "Interest rate",
          unit: "% per year",
          min: 1,
          max: 15,
          value: 8,
          step: 0.5,
        },
        { name: "t", label: "Time", unit: "years", min: 0, max: 30, value: 10, step: 1 },
      ],
      graphVariable: "t",
      caption: "Notice the curve bends upward: interest earns interest.",
    },
  },
  {
    heading: "Formula explorer · physics (pendulum)",
    visual: {
      type: "formula",
      formula: "2 * pi * sqrt(L / g)",
      output: { label: "Period", unit: "s" },
      variables: [
        { name: "L", label: "Length", unit: "m", min: 0.1, max: 5, value: 1, step: 0.1 },
        { name: "g", label: "Gravity", unit: "m/s²", min: 1, max: 25, value: 9.8, step: 0.1 },
      ],
      caption: "Notice doubling the length does NOT double the period.",
    },
  },
  {
    heading: "Step-through · method",
    visual: {
      type: "steps",
      steps: [
        { title: "Write the equation", body: "Start from $ax^2 + bx + c = 0$ with $a \\neq 0$." },
        {
          title: "Find the discriminant",
          body: "Compute $D = b^2 - 4ac$.",
          formula: "D = b^2 - 4ac",
        },
        {
          title: "Use the formula",
          body: "If $D \\ge 0$ the roots are real:",
          formula: "x = \\frac{-b \\pm \\sqrt{D}}{2a}",
        },
      ],
      caption: "Notice step 2 tells you how many real roots to expect before you solve.",
    },
  },
  {
    heading: "Stats · normal distribution",
    visual: {
      type: "stats",
      tool: "normal",
      mean: 70,
      sd: 10,
      shadeFrom: 60,
      shadeTo: 80,
      data: "illustrative",
      caption: "Notice about 68% of scores fall within one standard deviation of the mean.",
    },
  },
  {
    heading: "Stats · sampling (central limit theorem)",
    visual: {
      type: "stats",
      tool: "sampling",
      population: "skewed",
      sampleSize: 2,
      data: "computed",
      caption:
        "Notice the means become bell-shaped as the sample size grows, even from a skewed population.",
    },
  },
  {
    heading: "Stats · regression (drag the points)",
    visual: {
      type: "stats",
      tool: "regression",
      points: [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.9 },
        { x: 3, y: 6.2 },
        { x: 4, y: 7.8 },
        { x: 5, y: 10.1 },
      ],
      xLabel: "Force (N)",
      yLabel: "Extension (cm)",
      data: "illustrative",
      caption: "Notice r stays close to 1 while the points lie near a straight line.",
    },
  },
  {
    heading: "Compare · table",
    visual: {
      type: "compare",
      style: "table",
      columns: ["", "Series", "Parallel"],
      rows: [
        { label: "Current", cells: ["Same through each", "Splits between branches"] },
        { label: "Voltage", cells: ["Splits between parts", "Same across each"] },
        { label: "Total R", cells: ["R₁ + R₂", "R₁R₂ / (R₁ + R₂)"] },
      ],
      caption: "Notice current and voltage swap roles between the two circuits.",
    },
  },
  {
    heading: "Compare · Venn",
    visual: {
      type: "compare",
      style: "venn",
      sets: [
        { label: "Electric field", items: ["Starts on + charges", "Force on still charges"] },
        { label: "Magnetic field", items: ["Closed loops", "Force on moving charges"] },
      ],
      shared: ["Vector fields", "Drawn with field lines", "Store energy"],
      caption: "Notice what both fields share even though their sources differ.",
    },
  },
  {
    heading: "Compare · pros and cons",
    visual: {
      type: "compare",
      style: "pros-cons",
      left: ["Exact answer", "Works for any shape"],
      right: ["Integral can be hard", "Needs symmetry for a quick answer"],
      caption: "Notice Gauss's law is easy only when the symmetry is there.",
    },
  },
  {
    heading: "Compare · before and after",
    visual: {
      type: "compare",
      style: "before-after",
      left: ["Capacitor uncharged", "No field between the plates"],
      right: ["Plates hold +Q and −Q", "Uniform field between the plates"],
      caption: "Notice charging creates the field; the plates don't change.",
    },
  },
  {
    heading: "Diagram · mind map",
    visual: {
      type: "mermaid",
      code: "mindmap\n  root((Derivatives))\n    Rules\n      Product\n      Chain\n    Uses\n      Slopes\n      Maxima and minima",
      caption: "Notice the rules and the uses branch from the same idea.",
    },
  },
  {
    heading: "Diagram · sequence",
    visual: {
      type: "mermaid",
      code: "sequenceDiagram\n  Student->>Prism: Pick a topic\n  Prism->>AI: Write a lesson\n  AI-->>Prism: Lesson draft\n  Prism-->>Student: Checked lesson",
      caption: "Notice every lesson is checked before you see it.",
    },
  },
  {
    heading: "Diagram · state",
    visual: {
      type: "mermaid",
      code: "stateDiagram-v2\n  [*] --> Uncharged\n  Uncharged --> Charging: switch on\n  Charging --> Charged: full\n  Charged --> Discharging: switch off\n  Discharging --> Uncharged",
      caption: "Notice the capacitor cycles through four states.",
    },
  },
  {
    heading: "Diagram · Gantt",
    visual: {
      type: "mermaid",
      code: "gantt\n  title Revision plan\n  dateFormat YYYY-MM-DD\n  section Physics\n  Electrostatics :a1, 2026-10-05, 2d\n  Capacitance :after a1, 1d\n  section Maths\n  Integrals :2026-10-05, 3d",
      caption: "Notice physics and maths run side by side.",
    },
  },
];
