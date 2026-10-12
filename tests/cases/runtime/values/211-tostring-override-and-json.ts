// xl:title 覆盖 toString / valueOf 对模板与字符串化的影响
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Money {
  constructor(private amount: number, private unit: string) {}
  toString(): string { return this.amount.toFixed(2) + this.unit; }
  valueOf(): number { return this.amount; }
  toJSON(): { amount: number; unit: string } { return { amount: this.amount, unit: this.unit }; }
}
const m = new Money(12.5, "USD");
console.log(String(m), `${m}`, m + 1, m > 10);
console.log(JSON.stringify(m), JSON.stringify({ price: m }));
console.log([m, m].join(","), m.toString().length);
