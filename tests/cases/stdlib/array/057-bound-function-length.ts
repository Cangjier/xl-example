// xl:title `bind` 之后那个函数的 `length` 与 `name`
// xl:round 305
// xl:judge stdout
// xl:end

function f(a: number, b: number, c: number) { return a + b + c; }
const g = f.bind(null, 1, 2);
console.log(g(3), g.length, g.name);
