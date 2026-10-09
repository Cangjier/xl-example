// xl:title import type / export type 这一档在单文件里只是擦除
// xl:round 371
// xl:judge stdout
// xl:end
type Local = { n: number };
const value: Local = { n: 1 };
function use<T>(x: T): T { return x; }
console.log(use(value).n, use("s"), typeof use);
declare const anything: unknown;
console.log(typeof anything, value.n + 1);
