// Deterministic Nelder–Mead simplex minimizer. Pure function; no RNG.
// Used by the auto-allocator; the softmax parameterization means the search
// space is unconstrained R^n, so no bounds handling is needed here.

export interface NelderMeadResult {
  x: number[];
  fx: number;
  iterations: number;
  converged: boolean;
}

interface Vertex {
  x: number[];
  fx: number;
}

export interface NelderMeadOptions {
  maxIter?: number;
  tolFx?: number;
  tolX?: number;
  initialStep?: number;
}

/**
 * Minimise `f` starting from `x0` using the standard Nelder–Mead update.
 * The initial simplex is deterministic: it takes `x0` and perturbs each
 * coordinate by ±initialStep, so identical inputs always give identical output.
 */
export function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  opts: NelderMeadOptions = {},
): NelderMeadResult {
  const n = x0.length;
  if (n === 0) return { x: [], fx: f([]), iterations: 0, converged: true };

  const maxIter = opts.maxIter ?? 200;
  const tolFx = opts.tolFx ?? 1e-6;
  const tolX = opts.tolX ?? 1e-6;
  const step = opts.initialStep ?? 0.5;

  // Standard Nelder–Mead coefficients.
  const ALPHA = 1; // reflection
  const GAMMA = 2; // expansion
  const RHO = 0.5; // contraction
  const SIGMA = 0.5; // shrink

  // Deterministic initial simplex: x0 plus n perturbations of one coord each.
  const simplex: Vertex[] = [{ x: x0.slice(), fx: f(x0) }];
  for (let i = 0; i < n; i++) {
    const xi = x0.slice();
    const curr = xi[i]!;
    const perturb = curr === 0 ? step : curr * (1 + step);
    xi[i] = perturb;
    simplex.push({ x: xi, fx: f(xi) });
  }

  let iterations = 0;
  let converged = false;

  while (iterations < maxIter) {
    iterations++;
    simplex.sort((a, b) => a.fx - b.fx);

    const best = simplex[0]!;
    const worst = simplex[n]!;
    const secondWorst = simplex[n - 1]!;

    // Convergence: function-value spread and simplex diameter both small.
    const fxSpread = worst.fx - best.fx;
    let maxCoordSpread = 0;
    for (let i = 0; i < n; i++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of simplex) {
        const c = v.x[i]!;
        if (c < lo) lo = c;
        if (c > hi) hi = c;
      }
      const spread = hi - lo;
      if (spread > maxCoordSpread) maxCoordSpread = spread;
    }
    if (fxSpread < tolFx && maxCoordSpread < tolX) {
      converged = true;
      break;
    }

    // Centroid of all vertices except the worst.
    const centroid = new Array<number>(n).fill(0);
    for (let v = 0; v < n; v++) {
      for (let i = 0; i < n; i++) {
        centroid[i]! += simplex[v]!.x[i]!;
      }
    }
    for (let i = 0; i < n; i++) centroid[i]! /= n;

    // Reflection.
    const xr = centroid.map((c, i) => c + ALPHA * (c - worst.x[i]!));
    const fxr = f(xr);
    if (fxr < best.fx) {
      // Expansion.
      const xe = centroid.map((c, i) => c + GAMMA * (xr[i]! - c));
      const fxe = f(xe);
      simplex[n] = fxe < fxr ? { x: xe, fx: fxe } : { x: xr, fx: fxr };
      continue;
    }
    if (fxr < secondWorst.fx) {
      simplex[n] = { x: xr, fx: fxr };
      continue;
    }
    // Contraction.
    if (fxr < worst.fx) {
      const xc = centroid.map((c, i) => c + RHO * (xr[i]! - c));
      const fxc = f(xc);
      if (fxc < fxr) {
        simplex[n] = { x: xc, fx: fxc };
        continue;
      }
    } else {
      const xc = centroid.map((c, i) => c + RHO * (worst.x[i]! - c));
      const fxc = f(xc);
      if (fxc < worst.fx) {
        simplex[n] = { x: xc, fx: fxc };
        continue;
      }
    }
    // Shrink toward the best vertex.
    for (let v = 1; v <= n; v++) {
      const xs = simplex[v]!.x.map((xi, i) => best.x[i]! + SIGMA * (xi - best.x[i]!));
      simplex[v] = { x: xs, fx: f(xs) };
    }
  }

  simplex.sort((a, b) => a.fx - b.fx);
  const winner = simplex[0]!;
  return { x: winner.x, fx: winner.fx, iterations, converged };
}
