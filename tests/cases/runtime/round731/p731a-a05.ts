// xl:title `bind` 出来的函数那两格
// xl:round 731
// xl:judge stdout
// xl:end
function f(a: number, b: number) { return a + b; }
const b = f.bind(null, 1);
console.log(b.length, JSON.stringify(b.name));
console.log(typeof b, b(2));
