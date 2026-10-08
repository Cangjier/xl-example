// xl:title 闭包与环境：循环变量、嵌套、共享与独立
// xl:round 371
// xl:judge stdout
// xl:end
const fns: (() => number)[] = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
const varFns: (() => number)[] = [];
for (var j = 0; j < 3; j++) varFns.push(() => j);
console.log(varFns.map((f) => f()).join(","));
function counter(): () => number { let n = 0; return () => (n += 1); }
const c1 = counter();
const c2 = counter();
console.log(c1(), c1(), c2());
const shared: (() => number)[] = [];
{ let x = 1; shared.push(() => x); x = 2; }
console.log(shared[0]());
