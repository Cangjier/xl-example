// xl:title 判别式求值**一次**、`case` 表达式**从上往下**求值
// xl:round 742
// xl:judge stdout
// xl:end
let n = 0;
const d = () => { n += 1; return 2; };
const c = (v: number) => { n += 10; return v; };
switch (d()) {
  case c(1): console.log("c1"); break;
  case c(2): console.log("c2"); break;
  default: console.log("no");
}
console.log(n);
