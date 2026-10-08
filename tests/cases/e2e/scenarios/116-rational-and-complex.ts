// xl:title 有理数与复数两个小值类型（相等、运算、字符串）
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
function gcd(a: number, b: number): number { let x = Math.abs(a); let y = Math.abs(b); while (y) { const t = x % y; x = y; y = t; } return x || 1; }
class Rat {
  constructor(public n: number, public d: number = 1) {
    const g = gcd(n, d);
    const sign = d < 0 ? -1 : 1;
    this.n = (n / g) * sign;
    this.d = Math.abs(d / g);
  }
  add(o: Rat): Rat { return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); }
  mul(o: Rat): Rat { return new Rat(this.n * o.n, this.d * o.d); }
  equals(o: Rat): boolean { return this.n === o.n && this.d === o.d; }
  toString(): string { return this.d === 1 ? String(this.n) : this.n + "/" + this.d; }
  valueOf(): number { return this.n / this.d; }
}
console.log(new Rat(2, 4).toString(), new Rat(-4, 6).toString(), new Rat(3, -9).toString());
console.log(new Rat(1, 2).add(new Rat(1, 3)).toString(), new Rat(2, 3).mul(new Rat(3, 4)).toString());
console.log(new Rat(1, 2).equals(new Rat(2, 4)), new Rat(1, 2) + new Rat(1, 2) as any);
class Cx {
  constructor(public re: number, public im: number = 0) {}
  add(o: Cx): Cx { return new Cx(this.re + o.re, this.im + o.im); }
  mul(o: Cx): Cx { return new Cx(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re); }
  abs(): number { return Math.sqrt(this.re * this.re + this.im * this.im); }
  toString(): string { return this.im === 0 ? String(this.re) : this.re + (this.im < 0 ? "-" : "+") + Math.abs(this.im) + "i"; }
}
const i = new Cx(0, 1);
console.log(i.mul(i).toString(), new Cx(1, 2).add(new Cx(3, -1)).toString());
console.log(new Cx(3, 4).abs(), new Cx(5).toString());
