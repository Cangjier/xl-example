// xl:title 条件类型 + 映射类型 + 模板字面量类型（只在类型位）
// xl:judge stdout
// xl:end

type IsString<T> = T extends string ? "yes" : "no";
type Wrap<T> = { [K in keyof T]: T[K] };
type Event = `on${"Click" | "Hover"}`;
type A = IsString<string>;
type B = IsString<number>;
const w: Wrap<{ n: number }> = { n: 1 };
const ev: Event = "onClick";
console.log(w.n, ev, 1 as any satisfies number);
