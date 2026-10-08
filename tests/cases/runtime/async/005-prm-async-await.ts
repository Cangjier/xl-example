// xl:title async / await：顺序、返回值、await 一个非承诺
// xl:judge stdout
// xl:end

async function f(): Promise<number> {
  const a = await Promise.resolve(1);
  const b = await 2;
  return a + b;
}
f().then((v: number) => console.log("sum", v));
async function g(): Promise<void> {
  console.log("g-start");
  const v = await Promise.resolve("x");
  console.log("g-got", v);
}
g();
console.log("after-call");
