// xl:title 点名：eval 的两种形态（直接 / 间接）与它的作用域可见性
// xl:judge stdout
// xl:want blocked
// xl:why `eval` 没登记：报 name is not a local or a capture: eval——直接 / 间接两种形态与它要的内联作用域都还没有
// xl:end

const local = 1;
console.log(eval("local + 1"));
console.log(eval("var xx = 5; xx * 2"), typeof xx);
console.log(typeof eval, eval.length, (0, eval)("typeof globalThis"));
console.log(eval("({a: 1}).a"), eval("[1,2,3].length"));
