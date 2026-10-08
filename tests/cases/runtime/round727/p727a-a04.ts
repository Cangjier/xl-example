// xl:title **类型位**的 `void` 照旧（函数体 / 返回类型 / 数组类型）——这一格是那一轮的守卫
// xl:round 727
// xl:judge stdout
// xl:end
function f(): void { const t = 1; console.log("f", t); }
f();
class C { m(): void { console.log("m"); } }
new C().m();
const cb: () => void = () => { console.log("cb"); };
cb();
type V = void;
let xs: void[] = [];
console.log(xs.length, cb !== undefined);
interface I { go(): void; }
const o: I = { go(): void { console.log("go"); } };
o.go();
