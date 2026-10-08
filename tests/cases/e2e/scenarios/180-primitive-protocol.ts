// xl:title 端到端：Symbol.toPrimitive / toString / valueOf 的优先级
// xl:round 639
// xl:judge stdout
// xl:end

class Money {
  private cents: number;
  constructor(cents: number) { this.cents = cents; }
  valueOf(): number { return this.cents; }
  toString(): string { return "$" + (this.cents / 100).toFixed(2); }
  [Symbol.toPrimitive](hint: string): string | number {
    return hint === "string" ? this.toString() : this.cents;
  }
}
const m = new Money(1250);
console.log(m + 100);
console.log(`${m}`);
console.log(String(m));
console.log(m > 1000, m == 1250, m === 1250);
