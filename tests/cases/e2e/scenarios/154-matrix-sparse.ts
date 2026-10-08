// xl:title 稀疏矩阵：坐标存储、乘法、转置
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
type Entry = { r: number; c: number; v: number };
class Sparse {
  private map = new Map<string, number>();
  constructor(public rows: number, public cols: number) {}
  set(r: number, c: number, v: number): void {
    if (v === 0) this.map.delete(r + "," + c);
    else this.map.set(r + "," + c, v);
  }
  get(r: number, c: number): number { return this.map.get(r + "," + c) ?? 0; }
  get nnz(): number { return this.map.size; }
  entries(): Entry[] {
    return [...this.map.entries()].map(([k, v]) => {
      const [r, c] = k.split(",").map(Number);
      return { r, c, v };
    }).sort((a, b) => a.r - b.r || a.c - b.c);
  }
  transpose(): Sparse {
    const out = new Sparse(this.cols, this.rows);
    for (const e of this.entries()) out.set(e.c, e.r, e.v);
    return out;
  }
  mul(other: Sparse): Sparse {
    const out = new Sparse(this.rows, other.cols);
    for (const a of this.entries()) {
      for (const b of other.entries()) {
        if (a.c === b.r) out.set(a.r, b.c, out.get(a.r, b.c) + a.v * b.v);
      }
    }
    return out;
  }
  density(): string { return ((this.nnz / (this.rows * this.cols)) * 100).toFixed(1) + "%"; }
}
const a = new Sparse(3, 3);
a.set(0, 0, 1);
a.set(0, 2, 2);
a.set(2, 1, 3);
console.log(a.nnz, a.density(), JSON.stringify(a.entries()));
console.log(a.get(0, 2), a.get(1, 1));
const t = a.transpose();
console.log(t.rows, t.cols, JSON.stringify(t.entries()));
const m = a.mul(t);
console.log(m.rows, m.cols, JSON.stringify(m.entries()));
a.set(0, 2, 0);
console.log(a.nnz, a.get(0, 2));
