// xl:title async / await 的执行顺序与返回值
// xl:round 371
// xl:judge stdout
// xl:end
async function f(): Promise<number> {
  console.log("f-start");
  const a = await Promise.resolve(1);
  console.log("f-mid");
  const b = await 2;
  console.log("f-end");
  return a + b;
}
console.log("before");
f().then((v) => console.log("result", v));
console.log("after");
(async () => {
  for (const v of [1, 2]) {
    const r = await Promise.resolve(v * 10);
    console.log("loop", r);
  }
})();
