// xl:title `bind` 的偏应用与 `length` / `name`
// xl:round 691
// xl:judge stdout
// xl:end
function f(a: any, b: any, c: any): string { return a + "|" + b + "|" + c; }
const g: any = f.bind(null, 1);
console.log(g(2, 3), g.length, g.name);
const h: any = f.bind(null, 1, 2, 3, 4);
console.log(h());
