// xl:title 自定义 toString / valueOf 在字符串化与算术里生效
// xl:judge stdout
// xl:end

class Money {
  cents: number;
  constructor(cents: number) { this.cents = cents; }
  valueOf(): number { return this.cents; }
  toString(): string { return "$" + this.cents / 100; }
}
const m = new Money(250);
console.log("" + m, m + 50, m * 2, m > 100);
