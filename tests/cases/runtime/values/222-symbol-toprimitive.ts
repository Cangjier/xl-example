// xl:title Symbol.toPrimitive 各 hint
// xl:round 651
// xl:judge stdout
// xl:end

class Money {
  constructor(v: number) { this.v = v; }
  [Symbol.toPrimitive](hint: string): any {
    return hint === "number" ? this.v : "M" + this.v;
  }
  v: number;
}
const m = new Money(7);
console.log(m + 1, `${m}`, +m, String(m), m * 2);
