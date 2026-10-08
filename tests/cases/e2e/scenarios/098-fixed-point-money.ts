// xl:title 定点金额运算：分为单位、分配余数、汇总
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
class Money {
  constructor(public readonly cents: number) {}
  static from(amount: number): Money { return new Money(Math.round(amount * 100)); }
  add(other: Money): Money { return new Money(this.cents + other.cents); }
  sub(other: Money): Money { return new Money(this.cents - other.cents); }
  times(factor: number): Money { return new Money(Math.round(this.cents * factor)); }
  get dollars(): string {
    const sign = this.cents < 0 ? "-" : "";
    const abs = Math.abs(this.cents);
    return sign + Math.floor(abs / 100) + "." + String(abs % 100).padStart(2, "0");
  }
  toString(): string { return "$" + this.dollars; }
  valueOf(): number { return this.cents; }
}
const prices = [Money.from(19.99), Money.from(5.05), Money.from(0.1)];
const total = prices.reduce((a, b) => a.add(b), new Money(0));
console.log(total.toString(), total.cents);
console.log(total.times(1.08).toString(), total.sub(Money.from(1)).toString());
function allocate(amount: Money, weights: number[]): Money[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares: Money[] = [];
  let used = 0;
  for (let i = 0; i < weights.length; i++) {
    const share = i === weights.length - 1 ? amount.cents - used : Math.floor((amount.cents * weights[i]) / sum);
    shares.push(new Money(share));
    used += share;
  }
  return shares;
}
console.log(allocate(Money.from(10), [1, 1, 1]).map((m) => m.toString()).join(","));
console.log(allocate(new Money(100), [3, 7]).map((m) => m.cents).join(","));
