// xl:title `async` 生成器与 `for await`
// xl:round 749
// xl:judge stdout
// xl:end
// **合并**（第 784 轮）：原先两条同判定点的用例——
//   · runtime/round737/p737a-a12.ts（yield / yield await / return 三格 + 手动 next()）
//   · runtime/round749/p749a-a06.ts（for await 消费生成器 + for await 迭代混合可迭代对象）
// 判定点只有一个：`async` 生成器那一族（yield 的值、return 的 done、for await 的次序），
// 两条的断言已经并在这一条里；名字收敛到描述性，轮次留在 xl:round。
async function* g() { yield 1; yield await 2; return 3; }
async function main() {
  const out: number[] = [];
  for await (const v of g()) out.push(v);
  console.log("forawait", out.join(","));
  const it = g();
  console.log(JSON.stringify(await it.next()), JSON.stringify(await it.next()), JSON.stringify(await it.next()));
  const collected: number[] = [];
  for await (const v of [Promise.resolve(7), 8]) collected.push(v);
  console.log("mixed", collected.join(","));
}
main().then(() => console.log("done"));
console.log("sync");
