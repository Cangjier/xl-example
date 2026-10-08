// xl:title 映射类型与条件类型的擦除
// xl:round 291
// xl:judge stdout
// xl:end

type Keys<T> = { [K in keyof T]: T[K] };
type Unwrap<T> = T extends Promise<infer U> ? U : T;
const v: Keys<{ a: number }> = { a: 1 };
const r: Unwrap<number> = 2;
console.log(v.a, r);
