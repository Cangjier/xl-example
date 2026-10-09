// xl:title `async` 生成器与 `for await`：三种取值的形状
// xl:round 767
// xl:judge stdout
// xl:note 异步生成器那一族：`for await` 收的是**产出值**（`return` 那一档不进循环体）、
// xl:note 手动 `await it.next()` 给的是 `{value, done}` 那一对（含最后一次的 `return` 值）。
// xl:note 打印顺序也钉住：`main()` 是异步的 ⇒ 它的行都排在同步的 `05 after` **之后**
// xl:note （`05` 只挂在微任务上，而 `main` 至少让出一次）。
// xl:end
async function* gen() {
  yield 1;
  yield 2;
  return 3;
}
async function main(): Promise<void> {
  const seen: number[] = [];
  for await (const v of gen()) seen.push(v);
  console.log("01", seen.join(","));
  const it = gen();
  console.log("02", JSON.stringify(await it.next()));
  console.log("03", JSON.stringify(await it.next()));
  console.log("04", JSON.stringify(await it.next()));
}
main();
Promise.resolve().then(() => console.log("05 after"));
