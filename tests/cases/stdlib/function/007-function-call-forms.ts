// xl:title `call` / `apply` / `bind` 的三种形态
// xl:round 330
// xl:judge stdout
// xl:end

function add(this: any, a: number, b: number): number {
  return this.base + a + b;
}
const ctx = { base: 10 };
console.log(add.call(ctx, 1, 2), add.apply(ctx, [3, 4]));
const bound = add.bind(ctx, 5);
console.log(bound(6), bound.length, bound.name);
