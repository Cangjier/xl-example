// xl:title 实参传递：原始值拷贝、对象引用共享、重新赋值
// xl:round 371
// xl:judge stdout
// xl:end
function mutate(n: number, o: { v: number }, arr: number[]): void {
  n = 99;
  o.v = 99;
  arr.push(99);
  arr = [0];
}
let n = 1;
const o = { v: 1 };
const arr = [1];
mutate(n, o, arr);
console.log(n, o.v, JSON.stringify(arr));
function replace(o: { v: number }): void { o = { v: 5 }; }
const keep = { v: 1 };
replace(keep);
console.log(keep.v);
const shared = { v: 1 };
const alias = shared;
alias.v = 2;
console.log(shared.v, shared === alias, { v: 2 }.v === shared.v);
