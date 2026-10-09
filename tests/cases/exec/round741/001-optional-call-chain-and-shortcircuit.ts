// xl:title 可选调用 `?.()` 的链与短路：基名、实参、二元与 `await` 后面
// xl:round 741
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域五条原子探针 `p741b-b01` · `b02` · `b03` ·
// `b04` · `b06`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// （同域的 `p741b-b05` 是 `?.` 后面紧跟下标那一格的**账**，与这一族不同判据，另立一条。）
// 判据只有一条：**可选调用怎么短路**——基名为 `null` 时整条短路、
// 实参不求值、返回 `undefined`、接在二元与一元里仍然是 `undefined`、
// 接在成员链后面只护它左边那一格、`await` 一个可选调用照旧收值。
//
// **块与块之间排空一次微任务队列**（第 798 轮实测的坑，b04 是异步的）。
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // b01 · `o?.m()` 与 `o?.m?.()`
    const o: any = { m() { return 1; } };
    const n: any = null;
    console.log(o?.m(), n?.m?.());
  }
  await drain();

  {
    // b02 · 可选调用与实参短路
    const log: string[] = [];
    const o: any = null;
    console.log(o?.m?.(log.push("x")), log.length);
  }
  await drain();

  {
    // b03 · 可选调用与二元 / 一元
    const o: any = { m() { return 2; } };
    console.log(o?.m() + 1, !o?.m?.());
  }
  await drain();

  {
    // b04 · `await o?.m()`
    async function main() {
      const o: any = { m: () => Promise.resolve(3) };
      console.log(await o?.m(), await o?.m?.());
    }
    main();
  }
  await drain();

  {
    // b06 · 可选调用接在成员链后面
    const o: any = { a: { m() { return 5; } } };
    console.log(o.a.m?.(), o.a?.m?.());
  }
  await drain();
}
main();
