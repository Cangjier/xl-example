// xl:title 端到端：用假时钟做去抖与节流
// xl:round 7
// xl:judge stdout
// xl:end

type Call = { at: number; value: number };
class Debouncer {
  private timer = -1;
  private pending: Call | null = null;
  private fired: Call[] = [];
  private wait: number;
  private onFire: (c: Call) => void;
  constructor(wait: number, onFire: (c: Call) => void) {
    this.wait = wait;
    this.onFire = onFire;
  }
  push(at: number, value: number): void {
    this.pending = { at, value };
    this.timer = at + this.wait;
  }
  advance(to: number): void {
    if (this.timer >= 0 && to >= this.timer && this.pending !== null) {
      this.fired.push(this.pending);
      this.onFire(this.pending);
      this.pending = null;
      this.timer = -1;
    }
  }
  history(): string { return this.fired.map((c) => c.at + ":" + c.value).join(","); }
}
const seen: string[] = [];
const d = new Debouncer(10, (c) => seen.push(c.value + "@" + c.at));
for (const [at, value] of [[0, 1], [3, 2], [8, 3], [30, 4]] as Array<[number, number]>) {
  d.push(at, value);
  for (let t = at; t <= 40; t++) d.advance(t);
}
console.log(d.history(), seen.join("|"));
