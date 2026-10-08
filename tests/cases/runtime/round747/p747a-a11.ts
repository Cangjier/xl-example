// xl:title 解构 + 默认值 + 剩余，以及类型注解与 `satisfies` 的剥离
// xl:round 747
// xl:judge stdout
// xl:end
const f = (a: number, b: string = "x", { c = 1, d = 2 }: any = {}) => [a, b, c, d].join(",");
console.log(f(1), f(1, "y"), f(1, "y", { c: 3, d: 4 }));
const g = (...rest: number[]) => rest.length;
console.log(g(), g(1), g(1, 2, 3));
const h = ([a, b]: number[] = [7, 8]) => a + b;
console.log(h(), h([1, 2]));
const x = 1 as number;
const y = "s" satisfies string;
console.log(x, y, typeof x, typeof y);
const id = <T,>(v: T): T => v;
console.log((id as any)(5), (id as any)("s"), (id as any)(true));
const box: { v: number } = { v: 1 };
console.log(box.v, Object.keys(box).join(","));
const key = "k";
const { [key]: got } = { k: 7 } as any;
console.log(got);
