// xl:title 判别式是**自增表达式**：只求值一次
// xl:round 742
// xl:judge stdout
// xl:end
let i = 0;
switch (i++) {
  case 0: console.log("zero", i); break;
  default: console.log("d", i);
}
console.log(i);
