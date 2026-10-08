// xl:title 条件类型里的 infer 只活在类型位
// xl:round 304
// xl:judge stdout
// xl:end

type Unwrap<T> = T extends Promise<infer U> ? U : T extends Array<infer V> ? V : T;
type A = Unwrap<Promise<number>>;
type B = Unwrap<string[]>;
const a: A = 1;
const b: B = "s";
console.log(a, b, typeof a, typeof b);
