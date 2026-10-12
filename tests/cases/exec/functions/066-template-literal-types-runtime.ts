// xl:title 模板字面量类型 / 映射类型全部擦除
// xl:round 651
// xl:judge stdout
// xl:end

type Keys<T> = { [K in keyof T as `get${string & K}`]: () => T[K] };
type Ev = `on-${"a" | "b"}`;
class Store { v = 1; }
const s: Keys<Store> = { getv: () => 1 };
const e: Ev = "on-a";
console.log(s.getv(), e, typeof s, typeof e);
