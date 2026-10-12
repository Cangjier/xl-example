// xl:title 数组的 `join` / `toString` 走元素的 `toString`
// xl:round 338
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

class Money {
  constructor(public cents: number) {}
  toString(): string { return "$" + (this.cents / 100).toFixed(2); }
}
const row = [new Money(199), new Money(50)];
console.log(row.join(" | "), row.toString(), String(row));
console.log([1, [2, [3]]].join("-"), [1, [2, [3]]].toString());
console.log([null, undefined, false].join(","), [1, , 3].join("-"));
const like = { 0: "a", 1: "b", length: 2 };
console.log([].slice.call(like as any).join("+"), Array.prototype.join.call(like as any, "/"));
