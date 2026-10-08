// xl:title 带 `infer` 的条件类型只擦掉、值照跑
// xl:round 305
// xl:judge stdout
// xl:end

type ElementOf<T> = T extends (infer U)[] ? U : never;
const xs: ElementOf<number[]> = 1;
console.log(xs + 1);
