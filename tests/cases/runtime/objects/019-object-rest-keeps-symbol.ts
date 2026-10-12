// xl:title 对象剩余**保留**可枚举的符号键（`{ ...o }` 与 `...rest` 同一条口径）
// xl:round 305
// xl:judge stdout
// xl:end

const s = Symbol("k");
const o: any = { a: 1, [s]: 2, b: 3 };
const { a, ...rest } = o;
console.log(a, Object.keys(rest).join(","), (rest as any)[s], JSON.stringify({ ...o } as any));
