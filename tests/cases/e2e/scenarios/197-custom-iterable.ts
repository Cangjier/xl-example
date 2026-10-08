// xl:title 端到端：自定义可迭代类（Symbol.iterator + 生成器 + 展开与解构）
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Range {
  constructor(private from: number, private to: number, private step = 1) {}
  *[Symbol.iterator](): Generator<number> {
    for (let v = this.from; v <= this.to; v += this.step) yield v;
  }
  get size(): number { let n = 0; for (const _ of this) n++; return n; }
}
const r = new Range(1, 5);
console.log([...r].join(","), r.size, Array.from(r).length);
console.log([...new Range(0, 10, 3)].join(","));
const [first, ...rest] = r;
console.log(first, rest.join(","));
const m = new Map([...r].map((v) => [v, v * v] as const));
console.log(m.get(3), m.size);
try { for (const _ of new Range(5, 1)) {} console.log("empty-ok"); } catch (e) { console.log("err"); }
