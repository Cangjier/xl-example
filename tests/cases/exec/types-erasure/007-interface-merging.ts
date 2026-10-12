// xl:title 同名 interface 合并（纯类型位，合并后形状要能用）
// xl:judge stdout
// xl:end

interface I { a: number }
interface I { b: string }
interface J extends I { c: boolean }
const v: J = { a: 1, b: "s", c: true };
console.log(v.a, v.b, v.c);
