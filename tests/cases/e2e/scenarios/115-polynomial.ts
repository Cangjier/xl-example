// xl:title 多项式：加、乘、求值、求导
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Poly {
  constructor(public coeffs: number[]) {}
  static of(...c: number[]): Poly { return new Poly(c); }
  degree(): number { return this.coeffs.length - 1; }
  add(other: Poly): Poly {
    const n = Math.max(this.coeffs.length, other.coeffs.length);
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((this.coeffs[i] ?? 0) + (other.coeffs[i] ?? 0));
    return new Poly(trim(out));
  }
  mul(other: Poly): Poly {
    const out: number[] = [];
    for (let i = 0; i < this.coeffs.length + other.coeffs.length - 1; i++) out.push(0);
    for (let i = 0; i < this.coeffs.length; i++) {
      for (let j = 0; j < other.coeffs.length; j++) out[i + j] += this.coeffs[i] * other.coeffs[j];
    }
    return new Poly(trim(out));
  }
  eval(x: number): number {
    let out = 0;
    for (let i = this.coeffs.length - 1; i >= 0; i--) out = out * x + this.coeffs[i];
    return out;
  }
  derivative(): Poly {
    if (this.coeffs.length <= 1) return new Poly([0]);
    const out: number[] = [];
    for (let i = 1; i < this.coeffs.length; i++) out.push(this.coeffs[i] * i);
    return new Poly(out);
  }
  toString(): string {
    const parts: string[] = [];
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      if (this.coeffs[i] === 0) continue;
      parts.push(this.coeffs[i] + (i === 0 ? "" : i === 1 ? "x" : "x^" + i));
    }
    return parts.length === 0 ? "0" : parts.join(" + ");
  }
}
function trim(c: number[]): number[] {
  const out = c.slice();
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return out;
}
const p = Poly.of(1, 2, 3);
const q = Poly.of(0, 1);
console.log(p.toString(), q.toString(), p.degree(), q.degree());
console.log(p.add(q).toString(), p.mul(q).toString());
console.log(p.eval(2), p.eval(0), p.derivative().toString(), p.derivative().eval(2));
console.log(Poly.of(0).toString(), Poly.of(5).eval(10));
