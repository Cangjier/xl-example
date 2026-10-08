// xl:title 类表达式里的 constructor：体要跑、字段初始化要在体之前
// xl:round 301
// xl:judge stdout
// xl:end

interface Ctor { new (n: number): { n: number } }
const K: Ctor = class { n: number; constructor(n: number) { this.n = n; } };
console.log(new K(4).n);
const L = class Named { n = 1; constructor(v: number) { this.n = v; } };
console.log(new L(7).n);
const Base = class { greet(): string { return "base"; } };
const Derived = class extends Base { tag = "d"; constructor() { super(); this.tag = this.tag + "!"; } };
const d = new Derived();
console.log(d.greet(), d.tag);
