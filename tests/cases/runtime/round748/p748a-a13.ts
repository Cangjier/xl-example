// xl:title 解构：默认值只在 `undefined` 时生效、嵌套与剩余
// xl:round 748
// xl:judge stdout
// xl:end
const f = (a: any = "da", b: any = "db") => a + "|" + b;
console.log(f(), f(null, 0), f(undefined, undefined), f("x"), f(1, 2));
const { p = 1, q = 2 } = { p: undefined, q: null } as any;
console.log(p, q);
const [x = "dx", y = "dy"] = [undefined, null] as any;
console.log(x, y);
const { m: { n = 5 } = {} } = {} as any;
console.log(n);
const { ...rest } = { a: 1, b: 2 } as any;
console.log(JSON.stringify(rest));
