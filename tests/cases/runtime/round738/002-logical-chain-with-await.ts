// xl:title `await` 与逻辑链：它吃哪一段、在条件与 `for await` 里怎么短路
// xl:round 738
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域四条**异步**原子探针 `p738a-a02` · `a10` · `a14` · `a16`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`await` 的操作数只吃紧随其后的那一格**——后面跟逻辑链时吃的是那一格
// （第 739 轮收掉的那一格在这里是判据的一半）、在条件位与 `for await` 里也同样；
// `yield*` 与 `await` 混排时两条链各归各。
//
// **块与块之间排空一次微任务队列**（第 798 轮实测的坑）：不排空时几条承诺链会交叉推进，
// 读数就成了「并发形状」的读数。`await` 只加在块**之间**，块里的正文一行没改。
// （同域那些**同步**的块在 `001-logical-chain-positions-and-shortcircuit`：第 798 轮实测过
//  「生成器那一族进不了排空壳」，所以这一条里一个生成器块都没有。）
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // a02 · `await` 后面跟逻辑运算符
    async function f() { return [await (Promise.resolve(1) && 2), await (0 || 5), await (null ?? 6)].join(","); }
    f().then((v) => console.log(v));
  }
  await drain();

  {
    // a10 · `yield*` 与逻辑运算符 / `await` 混排
    function* inner() { yield 1; yield 2; }
    function* outer() { yield* inner(); yield (3 && 4); }
    console.log([...outer()].join(","));
    async function f() { return await (Promise.resolve(1) ?? 2) && "ok"; }
    f().then((v) => console.log(v));
  }
  await drain();

  {
    // a14 · `await` 后面跟逻辑链在条件与 `for await` 里
    async function f(x: any) { return await x && "T"; }
    async function g(x: any) { if (await x || false) return "Y"; return "N"; }
    async function main() {
      console.log(await f(Promise.resolve(1)), await f(Promise.resolve(0)));
      console.log(await g(Promise.resolve(0)), await g(Promise.resolve(1)));
      const out: string[] = [];
      for await (const v of [1, 2] as any) out.push((v && "v" + v) as string);
      console.log(out.join(","));
    }
    main();
  }
  await drain();

  {
    // a16 · `await` 的操作数只吃紧随其后的那一格（二元那一族；第 739 轮收掉）
    async function add(x: any) { return await x + 1; }
    async function and(x: any) { return await x && "T"; }
    async function main() {
      console.log(await add(Promise.resolve(1)), await and(Promise.resolve(0)), await and(1));
      console.log(await add("1"), await add(1));
    }
    main();
  }
  await drain();
}
main();
