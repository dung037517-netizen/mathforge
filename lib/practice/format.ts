/**
 * Typesetting helpers shared by the question templates.
 *
 * Templates build two parallel strings for most expressions: LaTeX for the
 * student, and plain infix for the audit, which the engine parses and
 * evaluates independently. Keeping both builders here means a sign or a
 * coefficient of 1 is handled once, correctly, rather than in eighty places.
 */

/* ------------------------------------------------------------------ */
/* Integers and fractions                                              */
/* ------------------------------------------------------------------ */

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

export interface Fraction {
  /** Numerator, carrying the sign. */
  readonly n: number;
  /** Denominator, always positive. */
  readonly d: number;
}

/** Reduce n/d to lowest terms with a positive denominator. */
export function reduce(n: number, d: number): Fraction {
  if (d === 0) throw new Error("A fraction cannot have a zero denominator.");
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d) || 1;
  const numerator = (sign * n) / divisor;
  return { n: Object.is(numerator, -0) ? 0 : numerator, d: (sign * d) / divisor };
}

export function fractionValue(fraction: Fraction): number {
  return fraction.n / fraction.d;
}

/** LaTeX for a reduced fraction: an integer, or a signed \frac. */
export function fracTex(n: number, d = 1): string {
  const reduced = reduce(n, d);
  if (reduced.d === 1) return intTex(reduced.n);
  const body = `\\frac{${Math.abs(reduced.n)}}{${reduced.d}}`;
  return reduced.n < 0 ? `-${body}` : body;
}

/** Infix for a reduced fraction, parenthesised so it is safe inside a product. */
export function fracExpr(n: number, d = 1): string {
  const reduced = reduce(n, d);
  if (reduced.d === 1) return reduced.n < 0 ? `(${reduced.n})` : String(reduced.n);
  return `(${reduced.n}/${reduced.d})`;
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** Remove floating-point dust such as 0.30000000000000004. */
export function tidy(value: number, digits = 10): number {
  const rounded = Number.parseFloat(value.toFixed(digits));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function groupThousands(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** LaTeX for an integer, with thousands separators from 10,000 up. */
export function intTex(value: number): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const body = digits.length >= 5 ? groupThousands(digits, "{,}") : digits;
  return rounded < 0 ? `-${body}` : body;
}

/**
 * LaTeX for a real number: integers stay integers, everything else is shown
 * to at most `places` decimals with trailing zeros removed.
 */
export function numTex(value: number, places = 4): string {
  const cleaned = tidy(value, places);
  if (Number.isInteger(cleaned)) return intTex(cleaned);
  const [whole, fractional = ""] = Math.abs(cleaned).toFixed(places).split(".");
  const trimmed = fractional.replace(/0+$/, "");
  const wholeTex = whole.length >= 5 ? groupThousands(whole, "{,}") : whole;
  const body = trimmed.length > 0 ? `${wholeTex}.${trimmed}` : wholeTex;
  return cleaned < 0 ? `-${body}` : body;
}

/** A fixed number of decimals, for probabilities and money. */
export function fixedTex(value: number, places: number): string {
  const cleaned = tidy(value, places);
  const [whole, fractional = ""] = Math.abs(cleaned).toFixed(places).split(".");
  const wholeTex = whole.length >= 5 ? groupThousands(whole, "{,}") : whole;
  const body = places > 0 ? `${wholeTex}.${fractional}` : wholeTex;
  return cleaned < 0 ? `-${body}` : body;
}

/** Plain-text number with ordinary commas, for prose outside maths. */
export function numText(value: number, places = 2): string {
  const cleaned = tidy(value, places);
  return cleaned.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: places,
  });
}

/** Dollars in prose. The backslash keeps the sign from opening a maths span. */
export function money(value: number, places = 0): string {
  const cleaned = tidy(value, places);
  const body = Math.abs(cleaned).toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
  return `${cleaned < 0 ? "-" : ""}\\$${body}`;
}

/** Wrap LaTeX as inline maths. */
export function m(tex: string): string {
  return `$${tex}$`;
}

/** Wrap LaTeX as a display equation on its own line. */
export function dm(tex: string): string {
  return `\n\n$$${tex}$$\n\n`;
}

/* ------------------------------------------------------------------ */
/* Algebraic expressions                                               */
/* ------------------------------------------------------------------ */

/** "3x", "x", "-x", "-3x" — and "3" when there is no symbol. */
export function coefTex(coefficient: number, symbol: string): string {
  if (symbol === "") return numTex(coefficient);
  if (coefficient === 1) return symbol;
  if (coefficient === -1) return `-${symbol}`;
  return `${numTex(coefficient)}${symbol}`;
}

export interface Term {
  readonly coefficient: number;
  /** LaTeX for the symbolic part; empty for a constant. */
  readonly symbol: string;
}

/** Join signed terms: [3x², −x, +4] → "3x^2 - x + 4". Zero terms are dropped. */
export function sumTex(terms: readonly Term[]): string {
  const live = terms.filter((term) => term.coefficient !== 0);
  if (live.length === 0) return "0";
  return live
    .map((term, index) => {
      const magnitude = coefTex(Math.abs(term.coefficient), term.symbol);
      if (index === 0) return term.coefficient < 0 ? `-${magnitude}` : magnitude;
      return term.coefficient < 0 ? `- ${magnitude}` : `+ ${magnitude}`;
    })
    .join(" ");
}

/** a·x + b in LaTeX. */
export function linearTex(a: number, b: number, symbol = "x"): string {
  return sumTex([
    { coefficient: a, symbol },
    { coefficient: b, symbol: "" },
  ]);
}

/**
 * Polynomial from coefficients in descending order: [1, -5, 6] → "x^2 - 5x + 6".
 */
export function polyTex(coefficients: readonly number[], symbol = "x"): string {
  const degree = coefficients.length - 1;
  return sumTex(
    coefficients.map((coefficient, index) => {
      const power = degree - index;
      const part = power === 0 ? "" : power === 1 ? symbol : `${symbol}^{${power}}`;
      return { coefficient, symbol: part };
    }),
  );
}

/** A number as engine infix, parenthesised when negative. */
export function exprNum(value: number): string {
  const cleaned = tidy(value);
  return cleaned < 0 ? `(${cleaned})` : String(cleaned);
}

/** Polynomial as engine infix: [1, -5, 6] → "1*x^2 + (-5)*x + 6". */
export function polyExpr(coefficients: readonly number[], symbol = "x"): string {
  const degree = coefficients.length - 1;
  const parts = coefficients
    .map((coefficient, index) => {
      const power = degree - index;
      if (coefficient === 0) return null;
      if (power === 0) return exprNum(coefficient);
      if (power === 1) return `${exprNum(coefficient)}*${symbol}`;
      return `${exprNum(coefficient)}*${symbol}^${power}`;
    })
    .filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" + ") : "0";
}

/** a·x + b as engine infix. */
export function linearExpr(a: number, b: number, symbol = "x"): string {
  return polyExpr([a, b], symbol);
}

/** Evaluate a polynomial given in descending order (Horner). */
export function polyValue(coefficients: readonly number[], x: number): number {
  return coefficients.reduce((accumulator, coefficient) => accumulator * x + coefficient, 0);
}

/** "(x - 3)", "(x + 2)", "x" — a linear factor with root r. */
export function factorTex(root: number, symbol = "x"): string {
  if (root === 0) return symbol;
  return root > 0 ? `(${symbol} - ${numTex(root)})` : `(${symbol} + ${numTex(-root)})`;
}

/** Signed constant for the middle of an expression: "+ 4" or "- 4". */
export function signedTex(value: number): string {
  return value < 0 ? `- ${numTex(-value)}` : `+ ${numTex(value)}`;
}

/** Signed term for the middle of an expression: "+ 3y", "- y". */
export function signedTermTex(coefficient: number, symbol: string): string {
  const magnitude = coefTex(Math.abs(coefficient), symbol);
  return coefficient < 0 ? `- ${magnitude}` : `+ ${magnitude}`;
}

/** Signed fraction for the middle of an expression: "+ \\frac{1}{2}", "- 3". */
export function signedFracTex(n: number, d = 1): string {
  const reduced = reduce(n, d);
  const magnitude = fracTex(Math.abs(reduced.n), reduced.d);
  return reduced.n < 0 ? `- ${magnitude}` : `+ ${magnitude}`;
}

/** Parenthesise a negative number so it reads correctly after an operator. */
export function parenTex(value: number): string {
  return value < 0 ? `(${numTex(value)})` : numTex(value);
}

/* ------------------------------------------------------------------ */
/* Radicals and multiples of pi                                        */
/* ------------------------------------------------------------------ */

/** Write √n as outside·√inside with the largest square factor pulled out. */
export function simplifyRoot(n: number): { outside: number; inside: number } {
  let outside = 1;
  let inside = Math.round(n);
  for (let factor = 2; factor * factor <= inside; factor += 1) {
    while (inside % (factor * factor) === 0) {
      outside *= factor;
      inside /= factor * factor;
    }
  }
  return { outside, inside };
}

/** LaTeX for k·√n in simplest radical form. */
export function rootTex(n: number, multiplier = 1): string {
  const { outside, inside } = simplifyRoot(n);
  const coefficient = multiplier * outside;
  if (inside === 1) return numTex(coefficient);
  return `${coefficient === 1 ? "" : coefficient === -1 ? "-" : numTex(coefficient)}\\sqrt{${inside}}`;
}

/** LaTeX for (n/d)·π in lowest terms: "\pi", "3\pi", "\frac{2\pi}{3}". */
export function piTex(n: number, d = 1): string {
  const reduced = reduce(n, d);
  if (reduced.n === 0) return "0";
  const sign = reduced.n < 0 ? "-" : "";
  const top = Math.abs(reduced.n) === 1 ? "\\pi" : `${Math.abs(reduced.n)}\\pi`;
  return reduced.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${reduced.d}}`;
}

/* ------------------------------------------------------------------ */
/* Prose                                                               */
/* ------------------------------------------------------------------ */

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

/** "a", "a and b", "a, b and c". */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Percentage in maths mode: 12.5 → "12.5\%". */
export function pctTex(value: number, places = 2): string {
  return `${numTex(value, places)}\\%`;
}
