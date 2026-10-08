// xl:title 断言与箭头挤在一行
// xl:round 304
// xl:judge stdout
// xl:end

const f = (v: unknown) => (v as string).trim();
const g = <T,>(v: T) => v as unknown as string;
console.log(f("  x  "), g("y"));
const arr = [1, 2] as number[];
console.log(arr.map((n) => (n as number) + 1).join(","));
