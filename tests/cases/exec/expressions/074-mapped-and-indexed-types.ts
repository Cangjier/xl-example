// xl:title 映射类型 / 索引访问类型 / 交叉类型都是擦除的
// xl:round 371
// xl:judge stdout
// xl:end
type Base = { a: number; b: string };
type Partial2 = { [K in keyof Base]?: Base[K] };
type Picked = Pick<Base, "a">;
type Combined = Base & { c: boolean };
const p: Partial2 = { a: 1 };
const picked: Picked = { a: 2 };
const combined: Combined = { a: 1, b: "s", c: true };
console.log(p.a, picked.a, combined.b, combined.c, Object.keys(combined).join(","));
