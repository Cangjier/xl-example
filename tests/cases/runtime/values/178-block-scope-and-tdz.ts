// xl:title 块作用域、遮蔽、先声明后使用的顺序
// xl:round 371
// xl:judge stdout
// xl:end
let x = "outer";
{
  let x = "block";
  console.log(x);
}
console.log(x);
function f(): string {
  let y = "f";
  if (true) { let y = "if"; return y; }
  return y;
}
console.log(f());
const order: string[] = [];
function g(): void { order.push(typeof z); var z = 1; order.push(String(z)); }
g();
console.log(order.join(","));
console.log([1, 2, 3].map((n) => { const d = n * 2; return d; }).join(","));
