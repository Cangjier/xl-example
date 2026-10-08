// xl:title 类型别名与后续语句写在同一行：别名擦掉、语句照跑
// xl:judge stdout
// xl:end

type F = () => number; const f: F = () => 7; console.log(f());
interface I { n: number } const v: I = { n: 1 }; console.log(v.n);
type G = { a: number } | null; const g: G = { a: 2 }; console.log(g.a);
