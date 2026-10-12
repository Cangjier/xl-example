// xl:title 解构形参 + 整段默认值 + 元素默认值
// xl:judge stdout
// xl:end

function f({ a = 1, b }: { a?: number; b: string } = { b: "z" }) {
  return a + b;
}
console.log(f(), f({ b: "q" }), f({ a: 5, b: "w" }));
