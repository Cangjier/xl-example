// 语料 03：函数、闭包、默认参数与可选参数（第 119 轮那一块的正脸）。

function add(a: number, b: number): number {
  return a + b;
}

// 默认参数：只有「没传」或「传了 undefined」才生效（null 不算）。
function greet(name: string = "world", mark: string = "!"): string {
  return "hi " + name + mark;
}

// 后一个默认值看得见前一个（求值从左到右）。
function box(a: number = 1, b: number = a + 10): number {
  return a * 100 + b;
}

// 可选参数是**纯类型位**：运行期与 `n: number` 一模一样（不传就是 undefined）。
function maybe(n?: number): number {
  return n === undefined ? 0 - 1 : n;
}

// 默认值里引用外层局部名 ⇒ 这一层要被捕获。
function counter(start: number = 0): () => number {
  let value = start;
  return () => {
    value += 1;
    return value;
  };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

const twice = function (n: number): number {
  return n * 2;
};

const square = (n: number) => n * n;

console.log("add", add(2, 3));
console.log("greet", greet(), greet("you"), greet(undefined, "?"), greet(null, "."));
console.log("box", box(), box(2), box(2, 3), box(undefined, 3));
console.log("maybe", maybe(), maybe(4));
console.log("factorial", factorial(5));
console.log("twice/square", twice(21), square(6));

const next = counter(10);
console.log("closure", next(), next(), next());
const other = counter();
console.log("closure-independent", other(), next());

// 回调走的是同一条通道（`Array.map/filter/forEach` 与 `Map/Set.forEach`）。
const xs: number[] = [1, 2, 3, 4];
let sum: number = 0;
xs.forEach((v) => {
  sum = sum + v;
});
console.log("forEach", sum, xs.map((v) => v * 3).join("|"), xs.filter((v) => v % 2 === 0).length);

// 立即调用的函数表达式：函数值一样能被调用。
const immediate = (function (n: number): number {
  return n + 100;
})(5);
console.log("iife", immediate);
