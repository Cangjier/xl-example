// xl:title 类实例上的 `valueOf` / `toString` / `Symbol.toPrimitive` 三档
// xl:round 768
// xl:judge stdout
// xl:note 三档的优先级一次钉住：**`Symbol.toPrimitive` 最优先**（怎么用它由 `hint` 决定），
// xl:note 否则 `valueOf` 先（`+t` / `t - u` / `t * 2` 走它）、`toString` 后（`String(t)` 走它）。
// xl:note `a == 150` 与 `a === 150` 那一对是**同一张表**的两种结果（`==` 要 `ToPrimitive`）。
// xl:note 模板那一档用 **hint `"string"`**（所以 `${a}` 走 `toString`、`a + ""` 走 `valueOf` 那一支）
// xl:note ——两条路给的东西不同，正是这一条要钉的。
// xl:end
class Money {
  cents: number;
  constructor(cents: number) { this.cents = cents; }
  valueOf(): number { return this.cents; }
  toString(): string { return "$" + (this.cents / 100).toFixed(2); }
}
const a = new Money(150);
const b = new Money(100);
console.log("01", a > b, a - b, a + b, String(a), `${a}`);
console.log("02", a == 150, a === 150, a + "");
class Temps {
  c: number;
  constructor(c: number) { this.c = c; }
  [Symbol.toPrimitive](hint: string): any { return hint === "number" ? this.c : "T" + this.c; }
}
const t = new Temps(20);
console.log("03", +t, t + "", String(t), t * 2);
