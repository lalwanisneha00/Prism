/*
 * Writes the golden sets (eval/golden/<subject>.json) from readable patterns. Run with
 * `node eval/build-golden.mjs` after editing. Each fact is a key point from the OpenStax
 * textbook section the lessons cite; its pattern is a case-insensitive regular expression
 * matched against the lesson text after LaTeX backslashes and braces are removed
 * (so \frac{Q}{\varepsilon_0} reads as "fracqvarepsilon_0").
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const r = String.raw;
const f = (id, claim, pattern) => ({ id, claim, pattern });
const description =
  "Key facts a correct lesson on each topic must state (from the cited OpenStax sections). Patterns are case-insensitive regular expressions matched against the lesson text after LaTeX backslashes and braces are removed.";

// The original 15 E&M topics stay exactly as they were (results stay comparable).
const original = existsSync("eval/golden.json")
  ? JSON.parse(readFileSync("eval/golden.json", "utf8")).topics
  : JSON.parse(readFileSync("eval/golden/em.json", "utf8")).topics.slice(0, 15);

// Widened after a hand check of run 2: "stored directly in the electric field" is the same fact.
for (const t of original) {
  for (const fact of t.facts) {
    if (t.topic === "capacitor-energy" && fact.id === "in-field") {
      fact.pattern = r`stored[^.]{0,20}in the (electric )?field|energy density`;
    }
  }
}

const eps0 = r`(var)?epsilon_?0`;
const emMore = [
  [
    "electric-dipole",
    "electrostatics",
    [
      f(
        "moment",
        "Dipole moment p = qd",
        r`p\s*=\s*q\s*\*?\s*(vec\s*)?d|charge (times|multiplied by) (the )?(separation|distance)|q\s*(·|cdot)\s*d`,
      ),
      f("direction", "p points from − to +", r`from (the )?negative (charge )?to (the )?positive`),
      f("torque", "Torque τ = p × E = pE sinθ", r`p\s*(times|×)\s*(vec\s*)?e|p\s*e\s*sin|pe\s*sin`),
    ],
  ],
  [
    "electric-flux",
    "electrostatics",
    [
      f(
        "definition",
        "Φ = EA cosθ (or ∫E·dA)",
        r`e\s*a\s*cos|ea\s*cos|e\s*(cdot|·)\s*d\s*(vec\s*)?a|int[^.]{0,30}e\s*(cdot|·)`,
      ),
      f(
        "units",
        "Units N·m²/C",
        r`n\s*(·|⋅|cdot|\.)?\s*m\^?2\s*/\s*c|n\s*m\^2/c|newton[- ]met(er|re)s? squared per coulomb`,
      ),
      f(
        "angle",
        "Flux is largest face-on and zero edge-on",
        r`(zero|no flux)[^.]{0,60}(parallel|edge[- ]on|90)|(parallel|edge[- ]on|90)[^.]{0,60}(zero|no flux)`,
      ),
    ],
  ],
  [
    "gauss-law-applications",
    "electrostatics",
    [
      f(
        "line",
        "Infinite line: E = λ/(2πε₀r)",
        r`frac\s*lambda\s*2\s*pi\s*${eps0}\s*r|lambda\s*/\s*\(?2\s*pi\s*${eps0}\s*r`,
      ),
      f(
        "sheet",
        "Infinite sheet: E = σ/(2ε₀)",
        r`frac\s*sigma\s*2\s*${eps0}|sigma\s*/\s*\(?2\s*${eps0}`,
      ),
      f("sphere", "Outside a charged sphere the field is like a point charge's", r`point charge`),
    ],
  ],
  [
    "equipotential-surfaces",
    "electrostatics",
    [
      f(
        "perpendicular",
        "Equipotentials are perpendicular to field lines",
        r`perpendicular|right angles|90\s*(°|\^circ|degrees)`,
      ),
      f(
        "no-work",
        "No work is done moving along an equipotential",
        r`no work|zero work|w\s*=\s*0|does not (do|require) (any )?work`,
      ),
      f(
        "conductor",
        "A conductor's surface is an equipotential",
        r`conductor[^.]{0,120}equipotential|equipotential[^.]{0,120}conductor`,
      ),
    ],
  ],
  [
    "parallel-plate-capacitor",
    "capacitance",
    [
      f(
        "capacitance",
        "C = ε₀A/d",
        r`frac\s*${eps0}\s*a\s*d|${eps0}\s*a\s*/\s*d|kappa\s*${eps0}\s*a\s*/?\s*d|frac\s*kappa\s*${eps0}\s*a\s*d`,
      ),
      f(
        "field",
        "Field between plates E = V/d (= σ/ε₀)",
        r`frac\s*v\s*d|v\s*/\s*d|frac\s*sigma\s*${eps0}|sigma\s*/\s*${eps0}`,
      ),
      f("uniform", "The field between the plates is uniform", r`uniform`),
    ],
  ],
  [
    "capacitor-combinations",
    "capacitance",
    [
      f(
        "series",
        "Series: 1/C = 1/C₁ + 1/C₂",
        r`frac\s*1\s*c_?(eq|s|total|t)?\s*=\s*frac\s*1\s*c_?1|1\s*/\s*c_?(eq|s|total|t)?\s*=\s*1\s*/\s*c_?1`,
      ),
      f("parallel", "Parallel: C = C₁ + C₂", r`c_?(eq|p|total|t)?\s*=\s*c_?1\s*\+\s*c_?2`),
      f("same-charge", "Series capacitors carry the same charge", r`same charge`),
    ],
  ],
  [
    "dielectrics",
    "capacitance",
    [
      f("kappa", "C = κC₀", r`kappa\s*c_?0|c\s*=\s*kappa|dielectric constant`),
      f(
        "increase",
        "A dielectric increases capacitance",
        r`increas[^.]{0,60}capacitance|capacitance[^.]{0,60}increas|multipl[^.]{0,40}capacitance`,
      ),
      f(
        "field",
        "The dielectric is polarized and reduces the field",
        r`polari[sz]|reduc[^.]{0,50}field|field[^.]{0,50}reduc|weaken`,
      ),
    ],
  ],
  [
    "current-drift-velocity",
    "current-electricity",
    [
      f("formula", "I = nqAv_d", r`i\s*=\s*n\s*(q|e)\s*a\s*(v|u)|n\s*(q|e)\s*a\s*v_?d|nqav|neav`),
      f(
        "slow",
        "Drift speed is very small (fractions of a mm/s)",
        r`(very )?(small|slow)|mm\s*/\s*s|10\^\s*\(?-\s*[345]`,
      ),
      f("ampere", "1 A = 1 C/s", r`ampere|c\s*/\s*s|coulombs? per second`),
    ],
  ],
  [
    "resistor-combinations",
    "current-electricity",
    [
      f("series", "Series: R = R₁ + R₂", r`r_?(eq|s|total|t)?\s*=\s*r_?1\s*\+\s*r_?2`),
      f(
        "parallel",
        "Parallel: 1/R = 1/R₁ + 1/R₂",
        r`frac\s*1\s*r_?(eq|p|total|t)?\s*=\s*frac\s*1\s*r_?1|1\s*/\s*r_?(eq|p|total|t)?\s*=\s*1\s*/\s*r_?1|frac\s*r_?1\s*r_?2\s*r_?1\s*\+\s*r_?2`,
      ),
      f("same-current", "Series resistors carry the same current", r`same current`),
    ],
  ],
  [
    "electrical-power",
    "current-electricity",
    [
      f("iv", "P = IV", r`p\s*=\s*i\s*v|p\s*=\s*v\s*i`),
      f("i2r", "P = I²R (= V²/R)", r`i\^2\s*r|i squared|frac\s*v\^2\s*r|v\^2\s*/\s*r`),
      f("watt", "Unit: watt", r`watt`),
    ],
  ],
  [
    "lorentz-force",
    "magnetostatics",
    [
      f("formula", "F = qv × B (F = qvB sinθ)", r`q\s*(vec\s*)?v\s*(times|×)|q\s*v\s*b\s*sin|qvb`),
      f(
        "no-work",
        "The magnetic force does no work",
        r`no work|zero work|does(n'?t| not) do (any )?work`,
      ),
      f(
        "circle",
        "Uniform B: circular motion, r = mv/(qB)",
        r`frac\s*m\s*v\s*q\s*b|m\s*v\s*/\s*\(?q\s*b|circ(le|ular)`,
      ),
    ],
  ],
  [
    "force-on-wire",
    "magnetostatics",
    [
      f(
        "formula",
        "F = IL × B (= BIL sinθ)",
        r`i\s*(vec\s*)?l\s*(times|×)|b\s*i\s*l|i\s*l\s*b|bil|ilb`,
      ),
      f("rhr", "Direction from the right-hand rule", r`right[- ]hand`),
      f("parallel", "Parallel currents attract", r`attract`),
    ],
  ],
  [
    "solenoid-toroid",
    "magnetostatics",
    [
      f("solenoid", "Solenoid: B = μ₀nI", r`mu_?0\s*n\s*i|mu_0ni`),
      f(
        "turns",
        "n is turns per unit length",
        r`turns per (unit )?(length|met)|n\s*=\s*frac\s*n\s*l|n\s*=\s*n\s*/\s*l`,
      ),
      f(
        "toroid",
        "Toroid: B = μ₀NI/(2πr)",
        r`frac\s*mu_?0\s*n\s*i\s*2\s*pi\s*r|mu_?0\s*n\s*i\s*/\s*\(?2\s*pi\s*r`,
      ),
    ],
  ],
  [
    "magnetic-flux",
    "induction",
    [
      f(
        "definition",
        "Φ_B = BA cosθ (or ∫B·dA)",
        r`b\s*a\s*cos|ba\s*cos|b\s*(cdot|·)\s*d\s*(vec\s*)?a|int[^.]{0,30}b\s*(cdot|·)`,
      ),
      f("weber", "Unit: weber (T·m²)", r`weber|\bwb\b|t\s*(·|⋅|cdot)?\s*m\^?2`),
    ],
  ],
  [
    "motional-emf",
    "induction",
    [
      f("blv", "ε = BLv", r`b\s*l\s*v|blv|b\s*v\s*l|bvl|vbl|v\s*b\s*l`),
      f(
        "force",
        "Charges in the moving rod feel a magnetic force",
        r`lorentz|force on (the )?(moving |free )?(charges|electrons)|q\s*v\s*b|qvb`,
      ),
      f("lenz", "The induced current opposes the motion (Lenz)", r`lenz|oppos`),
    ],
  ],
  [
    "inductance",
    "induction",
    [
      f(
        "emf",
        "ε = −L dI/dt",
        r`l\s*frac\s*d\s*i\s*d\s*t|l\s*d\s*i\s*/\s*d\s*t|l\s*fracdidt|l\s*di/dt`,
      ),
      f("henry", "Unit: henry", r`henr(y|ies)`),
      f(
        "energy",
        "Energy U = ½LI²",
        r`frac\s*1\s*2\s*l\s*i\^2|1\s*/\s*2\s*l\s*i\^2|½\s*l\s*i\^2|0\.5\s*l\s*i\^2`,
      ),
    ],
  ],
  [
    "ac-generator",
    "induction",
    [
      f(
        "emf",
        "ε = NBAω sin ωt",
        r`n\s*b\s*a\s*omega|nbaomega|n\s*a\s*b\s*omega|nab\s*omega|b\s*a\s*n\s*omega`,
      ),
      f("sinusoid", "The emf is sinusoidal", r`sinusoid|sin\s*\(?\s*omega\s*t`),
      f("rotation", "A coil rotates in a magnetic field", r`rotat`),
    ],
  ],
  [
    "phasors",
    "alternating-current",
    [
      f("rotating", "A phasor is a rotating vector", r`rotat`),
      f("amplitude", "Its length is the peak value", r`amplitude|peak`),
      f("projection", "The projection gives the instantaneous value", r`project`),
    ],
  ],
  [
    "impedance",
    "alternating-current",
    [
      f(
        "z",
        "Z = √(R² + (X_L − X_C)²)",
        r`sqrt\s*\(?\s*r\^2\s*\+\s*\(?\s*x_?l\s*-\s*x_?c|sqrtr\^2\s*\+\s*\(?x_?l\s*-\s*x_?c`,
      ),
      f("xl", "X_L = ωL", r`x_?l\s*=\s*(omega|2\s*pi\s*f)\s*l`),
      f(
        "xc",
        "X_C = 1/(ωC)",
        r`x_?c\s*=\s*frac\s*1\s*(omega|2\s*pi\s*f)\s*c|x_?c\s*=\s*1\s*/\s*\(?\s*(omega|2\s*pi\s*f)\s*c`,
      ),
    ],
  ],
  [
    "lcr-resonance",
    "alternating-current",
    [
      f(
        "omega0",
        "ω₀ = 1/√(LC)",
        r`frac\s*1\s*(2\s*pi\s*)?sqrt\s*\(?\s*l\s*c|1\s*/\s*\(?(2\s*pi\s*)?sqrt\s*\(?\s*l\s*c`,
      ),
      f("equal", "At resonance X_L = X_C", r`x_?l\s*=\s*x_?c`),
      f(
        "max-current",
        "Impedance is smallest (Z = R), current largest",
        r`z\s*=\s*r\b|maximum current|current[^.]{0,40}(maximum|largest|greatest|peaks?)|minimum impedance|impedance[^.]{0,40}(minimum|smallest)`,
      ),
    ],
  ],
  [
    "power-factor",
    "alternating-current",
    [
      f("cos", "Power factor is cos φ", r`cos\s*\(?\s*(phi|φ|varphi|theta)|cosine of the phase`),
      f(
        "pavg",
        "P_avg = V_rms I_rms cos φ",
        r`v_?\s*(rms)?\s*i_?\s*(rms)?\s*cos|i_?\s*(rms)?\s*v_?\s*(rms)?\s*cos`,
      ),
      f("r-over-z", "cos φ = R/Z", r`frac\s*r\s*z|r\s*/\s*z`),
    ],
  ],
  [
    "displacement-current",
    "em-waves",
    [
      f(
        "formula",
        "I_d = ε₀ dΦ_E/dt",
        r`${eps0}\s*frac\s*d\s*(phi|φ)|${eps0}\s*d\s*(phi|φ)|${eps0}\s*fracd`,
      ),
      f("maxwell", "Introduced by Maxwell", r`maxwell`),
      f("capacitor", "Explains the 'current' in a charging capacitor's gap", r`capacitor`),
    ],
  ],
  [
    "maxwells-equations",
    "em-waves",
    [
      f("four", "There are four equations", r`four`),
      f(
        "monopoles",
        "No magnetic monopoles (Gauss's law for magnetism)",
        r`monopole|(net )?magnetic flux[^.]{0,60}(closed surface)[^.]{0,40}zero`,
      ),
      f(
        "waves",
        "They predict electromagnetic waves travelling at c",
        r`(electromagnetic|em) waves?|speed of light`,
      ),
    ],
  ],
  [
    "em-waves",
    "em-waves",
    [
      f(
        "speed",
        "c = 1/√(μ₀ε₀)",
        r`frac\s*1\s*sqrt\s*\(?\s*(mu_?0\s*${eps0}|${eps0}\s*mu_?0)|1\s*/\s*sqrt\s*\(?\s*(mu_?0\s*${eps0}|${eps0}\s*mu_?0)`,
      ),
      f("value", "c ≈ 3.00 × 10⁸ m/s", r`3(\.0+)?\s*(×|times|x)\s*10\^\s*8|2\.998|299[ ,]?792`),
      f(
        "transverse",
        "E and B are perpendicular to each other and to the direction of travel",
        r`transverse|perpendicular`,
      ),
    ],
  ],
  [
    "poynting-vector",
    "em-waves",
    [
      f(
        "formula",
        "S = (1/μ₀) E × B",
        r`frac\s*1\s*mu_?0|1\s*/\s*mu_?0|e\s*(times|×)\s*(vec\s*)?b\s*/\s*mu_?0|s\s*=\s*e\s*(times|×|cdot|·)\s*h`,
      ),
      f("intensity", "Intensity in W/m²", r`w\s*/\s*m\^?2|watts? per square met`),
      f(
        "direction",
        "It points along the direction of energy flow",
        r`energy flow|flow of energy|direction[^.]{0,60}(energy|propagat)`,
      ),
    ],
  ],
].map(([topic, chapter, facts]) => ({ topic, chapter, facts }));

const math = [
  [
    "limits-continuity",
    "differential-calculus",
    [
      f(
        "continuity",
        "f is continuous at a when lim f(x) = f(a)",
        r`lim[^.\n]{0,40}=\s*f\s*\(?\s*a|limit (equals|is equal to) (the )?(function'?s? )?value`,
      ),
      f(
        "one-sided",
        "The limit exists when the left- and right-hand limits agree",
        r`left[- ]hand[^.]{0,120}right[- ]hand|right[- ]hand[^.]{0,120}left[- ]hand|one[- ]sided`,
      ),
    ],
  ],
  [
    "derivatives-basics",
    "differential-calculus",
    [
      f(
        "definition",
        "f'(x) = lim_{h→0} (f(x+h) − f(x))/h",
        r`lim_?\s*\(?\s*h\s*(to|→|->)\s*0|limh\s*to\s*0|difference quotient`,
      ),
      f("power", "Power rule: d/dx xⁿ = n xⁿ⁻¹", r`n\s*x\^\s*\(?\s*n\s*-\s*1`),
      f(
        "tangent",
        "The derivative is the slope of the tangent",
        r`slope of (the )?tangent|tangent line|gradient of (the )?tangent`,
      ),
    ],
  ],
  [
    "mean-value-theorems",
    "differential-calculus",
    [
      f("rolle", "Rolle: f(a) = f(b) ⇒ f'(c) = 0", r`f\s*'\s*\(\s*c\s*\)\s*=\s*0`),
      f(
        "mvt",
        "MVT: f'(c) = (f(b) − f(a))/(b − a)",
        r`frac\s*f\s*\(\s*b\s*\)\s*-\s*f\s*\(\s*a\s*\)\s*b\s*-\s*a|\(?\s*f\s*\(\s*b\s*\)\s*-\s*f\s*\(\s*a\s*\)\s*\)?\s*/\s*\(?\s*b\s*-\s*a`,
      ),
      f(
        "conditions",
        "Continuous on [a, b], differentiable on (a, b)",
        r`continuous[^.]{0,80}differentiable`,
      ),
    ],
  ],
  [
    "taylor-maclaurin",
    "differential-calculus",
    [
      f("term", "General term f⁽ⁿ⁾(a)/n! · (x − a)ⁿ", r`n\s*!`),
      f(
        "maclaurin",
        "Maclaurin series = Taylor series at a = 0",
        r`maclaurin[^.]{0,100}(a\s*=\s*0|zero|x\s*=\s*0|origin)|(a\s*=\s*0|about zero|at zero|centred at 0|centered at 0)[^.]{0,100}maclaurin`,
      ),
      f(
        "exp",
        "eˣ = 1 + x + x²/2! + …",
        r`1\s*\+\s*x\s*\+\s*frac\s*x\^2\s*2|1\s*\+\s*x\s*\+\s*x\^2\s*/\s*2`,
      ),
    ],
  ],
  [
    "lhopital-rule",
    "differential-calculus",
    [
      f(
        "forms",
        "Applies to 0/0 or ∞/∞",
        r`frac\s*0\s*0|0\s*/\s*0|infty\s*/\s*infty|frac\s*infty\s*infty|indeterminate`,
      ),
      f(
        "rule",
        "lim f/g = lim f'/g'",
        r`frac\s*f\s*'\s*\(?\s*x\s*\)?\s*g\s*'|f\s*'\s*\(?\s*x\s*\)?\s*/\s*g\s*'`,
      ),
      f(
        "not-quotient",
        "Differentiate top and bottom separately (not the quotient rule)",
        r`separately|quotient rule`,
      ),
    ],
  ],
  [
    "maxima-minima-one-variable",
    "differential-calculus",
    [
      f("critical", "Critical points: f'(x) = 0", r`f\s*'\s*\(\s*[xc]\s*\)\s*=\s*0|critical point`),
      f(
        "second",
        "f''(x) > 0 ⇒ local minimum",
        r`f\s*''\s*\(\s*[xc]\s*\)\s*>\s*0|second derivative[^.]{0,100}(positive|minimum)`,
      ),
      f("local", "Local (relative) vs absolute extrema", r`local|relative`),
    ],
  ],
  [
    "partial-derivatives",
    "partial-differentiation",
    [
      f(
        "constant",
        "Other variables are held constant",
        r`(held|hold|holding|keep|keeping|treat(ed|ing)?)[^.]{0,40}constant`,
      ),
      f("symbol", "Written with ∂", r`partial|∂`),
      f(
        "mixed",
        "Mixed partials are equal (Clairaut)",
        r`clairaut|mixed partial|f_?\s*xy\s*=\s*f_?\s*yx|schwarz`,
      ),
    ],
  ],
  [
    "eulers-theorem-homogeneous",
    "partial-differentiation",
    [
      f(
        "statement",
        "x ∂u/∂x + y ∂u/∂y = n u",
        r`=\s*[nk]\s*u\b|=\s*[nk]\s*(\\cdot\s*)?f\s*\(?\s*x\s*,?\s*y|=\s*[nk]f`,
      ),
      f(
        "homogeneous",
        "Homogeneous of degree n: f(tx, ty) = tⁿ f(x, y)",
        // Any letters for the degree and the scale factor (degree k, s^k f(x, y) is the same).
        r`(t|lambda|s|k)\^\s*[nk]\s*f|degree\s*[nk]\b`,
      ),
    ],
  ],
  [
    "lagrange-multipliers",
    "partial-differentiation",
    [
      f(
        "condition",
        "∇f = λ∇g",
        r`nabla\s*f\s*=\s*lambda\s*nabla\s*g|grad\s*f\s*=\s*lambda|f_?x\s*=\s*lambda\s*g_?x`,
      ),
      f("constraint", "Optimise subject to a constraint g = c", r`constraint`),
      f("lambda", "λ is the Lagrange multiplier", r`lambda|λ`),
    ],
  ],
  [
    "definite-integrals",
    "integral-calculus",
    [
      f("ftc", "∫ₐᵇ f(x) dx = F(b) − F(a)", r`f\s*\(\s*b\s*\)\s*-\s*f\s*\(\s*a\s*\)`),
      f("area", "The definite integral gives (signed) area under the curve", r`area under`),
      f("antiderivative", "F is an antiderivative of f", r`antiderivative`),
    ],
  ],
  [
    "double-integrals",
    "integral-calculus",
    [
      f(
        "iterated",
        "Evaluated as iterated integrals",
        r`iterated|inner integral|integrate (first )?with respect to`,
      ),
      f(
        "order",
        "Order can be swapped (Fubini)",
        r`fubini|order of integration|either order|reverse the order|switch the order`,
      ),
      f("volume", "Gives volume under a surface (or area when f = 1)", r`volume`),
    ],
  ],
  [
    "eigenvalues-eigenvectors",
    "linear-algebra",
    [
      f(
        "definition",
        "Av = λv",
        r`a\s*(vec\s*|mathbf\s*)?(v|x)\s*=\s*lambda\s*(vec\s*|mathbf\s*)?(v|x)`,
      ),
      f(
        "characteristic",
        "det(A − λI) = 0",
        r`det\s*\(?\s*a\s*-\s*lambda\s*(mathbf\s*)?i|\|\s*a\s*-\s*lambda\s*i\s*\||characteristic (equation|polynomial)`,
      ),
      f("nonzero", "Eigenvectors are non-zero", r`non-?zero`),
    ],
  ],
  [
    "separable-ode",
    "differential-equations",
    [
      f(
        "form",
        "dy/dx = g(x) h(y)",
        r`=\s*g\s*\(\s*x\s*\)\s*h\s*\(\s*y\s*\)|=\s*f\s*\(\s*x\s*\)\s*g\s*\(\s*y\s*\)|function of x[^.]{0,40}function of y`,
      ),
      f(
        "integrate",
        "Separate the variables and integrate both sides",
        r`integrat[^.]{0,60}both sides|both sides[^.]{0,60}integrat`,
      ),
      f(
        "constant",
        "Add a constant of integration",
        r`\+\s*c\b|constant of integration|arbitrary constant`,
      ),
    ],
  ],
  [
    "linear-first-order-ode",
    "differential-equations",
    [
      f("form", "dy/dx + P(x) y = Q(x)", r`p\s*\(\s*x\s*\)\s*y\s*=\s*q\s*\(\s*x\s*\)`),
      f("if", "Integrating factor e^{∫P dx}", r`integrating factor`),
      f("ife", "μ = e^{∫P(x) dx}", r`e\^\s*\(?\s*int\s*p`),
    ],
  ],
  [
    "laplace-transform",
    "series-and-transforms",
    [
      f("definition", "L{f} = ∫₀^∞ e^{−st} f(t) dt", r`e\^\s*\(?\s*-\s*s\s*t`),
      f("one", "L{1} = 1/s", r`frac\s*1\s*s\b|1\s*/\s*s\b`),
      f("linear", "The transform is linear", r`linear`),
    ],
  ],
  [
    "fourier-series",
    "series-and-transforms",
    [
      f("form", "a₀ + Σ (aₙ cos nx + bₙ sin nx)", r`a_?n\s*cos|cos\s*\(?\s*n\s*x`),
      f(
        "coefficients",
        "aₙ = (1/π) ∫ f(x) cos nx dx",
        r`frac\s*1\s*(pi|l)\s*int|1\s*/\s*(pi|l)\s*int`,
      ),
      f("periodic", "Represents a periodic function (period 2π)", r`periodic|2\s*pi`),
    ],
  ],
  [
    "gradient-divergence-curl",
    "vector-calculus",
    [
      f(
        "divergence",
        "Divergence ∇·F is a scalar",
        r`nabla\s*(cdot|·)|div(ergence)?\s*(vec\s*|mathbf\s*)?f`,
      ),
      f("curl", "Curl ∇×F is a vector", r`nabla\s*(times|×)|curl`),
      f(
        "gradient",
        "The gradient points in the direction of greatest increase",
        r`(greatest|steepest|maximum|fastest)[^.]{0,40}(increase|ascent|rate)`,
      ),
    ],
  ],
  [
    "greens-theorem",
    "vector-calculus",
    [
      f(
        "statement",
        "∮ P dx + Q dy = ∬ (∂Q/∂x − ∂P/∂y) dA",
        r`partial\s*q\s*partial\s*x\s*-\s*frac\s*partial\s*p\s*partial\s*y|q_?x\s*-\s*p_?y|frac\s*partial\s*q\s*partial\s*x\s*-`,
      ),
      f(
        "region",
        "Relates a line integral round a closed curve to a double integral over the region",
        r`double integral|region`,
      ),
      f(
        "orientation",
        "The curve is traversed counterclockwise (positively oriented)",
        r`counter-?clockwise|anticlockwise|anti-clockwise|positive(ly)? orient`,
      ),
    ],
  ],
].map(([topic, chapter, facts]) => ({ topic, chapter, facts }));

mkdirSync("eval/golden", { recursive: true });
const write = (subject, topics) =>
  writeFileSync(
    `eval/golden/${subject}.json`,
    `${JSON.stringify({ description, subject, topics }, null, 2)}\n`,
  );
write("em", [...original, ...emMore]);
write("engg-math", math);
console.log(`em: ${original.length + emMore.length} topics, engg-math: ${math.length} topics`);
