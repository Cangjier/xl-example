// xl:title 映射类型 + keyof：只擦类型，值照跑
// xl:round 304
// xl:judge stdout
// xl:end

type Flags<T> = { [K in keyof T]: boolean };
const flags: Flags<{ a: number; b: string }> = { a: true, b: false };
console.log(flags.a, flags.b, Object.keys(flags).join(","));
