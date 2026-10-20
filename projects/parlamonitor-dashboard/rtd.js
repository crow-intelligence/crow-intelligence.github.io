/* Rank-turbulence divergence (Dodds et al. 2020) in the browser.
 *
 * A line-for-line port of keyflux's `rtd` and `RankedList.aligned`, so that a
 * comparison the dashboard computes on the fly is the number keyflux would
 * give: tests/test_dashboard_rtd.py runs this file under node against keyflux
 * on random inputs and fails on any difference beyond floating-point noise.
 *
 *   - Ranks are fractional: tied counts share the average of the ranks they
 *     span.
 *   - Both lists are re-ranked over the union of their types; a type absent
 *     from one list gets count 0 there, so it ties at the bottom (tied-last).
 *   - delta = |r1^-a - r2^-a|^(1/(a+1)), normalised by the divergence of the
 *     maximally disjoint pair; alpha = 0 uses the logarithmic limit.
 *
 * Pure functions, no DOM: import it from the page or from node. */

const ALPHA_ZERO_TOL = 1e-10;

/* Map -> Map of fractional ranks, highest count = rank 1, ties averaged.
 * Ties are broken by nothing: equal counts get equal ranks, so input order
 * cannot change the result. */
export function averageRanks(counts) {
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const ranks = new Map();
  let i = 0;
  while (i < ordered.length) {
    let j = i;
    while (j < ordered.length && ordered[j][1] === ordered[i][1]) j++;
    const average = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranks.set(ordered[k][0], average);
    i = j;
  }
  return ranks;
}

/* Kahan-Babuska summation, standing in for Python's math.fsum closely enough
 * that sums of a few thousand small terms agree to ~1e-15. */
function fsum(values) {
  let sum = 0, c = 0;
  for (const v of values) {
    const t = sum + v;
    c += Math.abs(sum) >= Math.abs(v) ? (sum - t) + v : (v - t) + sum;
    sum = t;
  }
  return sum + c;
}

/* counts1, counts2: Map(type -> positive count). Returns
 * { divergence, raw, alpha, types: [{t, r1, r2, c1, c2, contrib, dir}] },
 * types sorted by contribution, descending; contributions sum to divergence.
 * Throws on a negative alpha or an empty list, as keyflux does. */
export function rtd(counts1, counts2, alpha = 1 / 3) {
  if (alpha < 0) throw new Error(`alpha must be non-negative, got ${alpha}.`);
  if (!counts1.size || !counts2.size) throw new Error("Both ranked lists must be non-empty.");
  // Sorted like keyflux's union, so equal contributions keep the same order.
  const union = [...new Set([...counts1.keys(), ...counts2.keys()])]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const vec1 = new Map(union.map(t => [t, counts1.get(t) || 0]));
  const vec2 = new Map(union.map(t => [t, counts2.get(t) || 0]));
  const ranks1 = averageRanks(vec1), ranks2 = averageRanks(vec2);
  const n1 = counts1.size, n2 = counts2.size;

  const deltas = new Array(union.length);
  const normTerms = [];
  let prefactor;
  if (alpha < ALPHA_ZERO_TOL) {
    const ref1 = Math.log(n1 + 0.5 * n2), ref2 = Math.log(n2 + 0.5 * n1);
    union.forEach((t, k) => {
      const l1 = Math.log(ranks1.get(t)), l2 = Math.log(ranks2.get(t));
      deltas[k] = Math.abs(l1 - l2);
      normTerms.push(Math.abs(l1 - ref1) + Math.abs(ref2 - l2));
    });
    prefactor = 1;
  } else {
    const exp = 1 / (alpha + 1);
    const ref1 = (n1 + 0.5 * n2) ** -alpha, ref2 = (n2 + 0.5 * n1) ** -alpha;
    union.forEach((t, k) => {
      const a1 = ranks1.get(t) ** -alpha, a2 = ranks2.get(t) ** -alpha;
      deltas[k] = Math.abs(a1 - a2) ** exp;
      normTerms.push(Math.abs(a1 - ref1) ** exp + Math.abs(ref2 - a2) ** exp);
    });
    prefactor = (alpha + 1) / alpha;
  }
  const raw = prefactor * fsum(deltas);
  const normalizer = prefactor * normTerms.reduce((s, v) => s + v, 0);
  const divergence = normalizer > 0 ? raw / normalizer : 0;
  const share = normalizer > 0 ? normalizer : 1;
  const types = union.map((t, k) => {
    const r1 = ranks1.get(t), r2 = ranks2.get(t);
    return {
      t, r1, r2,
      c1: counts1.get(t) || 0, c2: counts2.get(t) || 0,
      contrib: prefactor * deltas[k] / share,
      dir: r1 < r2 ? "left" : r2 < r1 ? "right" : "shared"
    };
  }).sort((a, b) => b.contrib - a.contrib);
  return { divergence, raw, alpha, types };
}
