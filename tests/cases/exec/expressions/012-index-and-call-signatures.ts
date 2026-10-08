// xl:title 索引签名 + 调用签名 + 构造签名（都是类型位）
// xl:judge stdout
// xl:end

interface Dict { [k: string]: number }
interface Fn { (a: number): number; tag: string }
interface Ctor { new (n: number): { n: number } }
const d: Dict = { a: 1, b: 2 };
const f: Fn = Object.assign((n: number) => n + 1, { tag: "t" });
const C: Ctor = class { n: number; constructor(n: number) { this.n = n; } };
console.log(d.a + d["b"], f(1), f.tag, new C(4).n);
