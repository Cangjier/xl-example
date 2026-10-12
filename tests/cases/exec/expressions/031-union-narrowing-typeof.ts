// xl:title 联合类型 + typeof 收窄：两个分支都跑
// xl:judge stdout
// xl:end

function f(x: string | number): string {
  if (typeof x === "string") return x.toUpperCase();
  return x.toFixed(1);
}
console.log(f("abc"), f(2));
