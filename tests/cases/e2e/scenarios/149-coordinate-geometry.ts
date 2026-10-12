// xl:title 二维几何：距离、点在多边形内、凸包
// xl:round 371
// xl:judge stdout
// xl:end
type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
function inside(poly: Pt[], p: Pt): boolean {
  let inside2 = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const crosses = (a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside2 = !inside2;
  }
  return inside2;
}
function hull(points: Pt[]): Pt[] {
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: Pt[]): Pt[] => {
    const out: Pt[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out;
  };
  const lower = build(pts);
  const upper = build(pts.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const square: Pt[] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
console.log(dist({ x: 0, y: 0 }, { x: 3, y: 4 }));
console.log(inside(square, { x: 2, y: 2 }), inside(square, { x: 5, y: 2 }), inside(square, { x: 0, y: 2 }));
const cloud: Pt[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 0, y: 2 }];
console.log(hull(cloud).map((p) => p.x + "," + p.y).join(" "));
console.log(hull(cloud).length, inside(hull(cloud), { x: 1, y: 1 }));
