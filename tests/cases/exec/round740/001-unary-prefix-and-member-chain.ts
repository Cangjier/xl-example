// xl:title 一元前缀与成员链：`typeof` / `delete` / `++` / `!` / `-` 的落点与紧密度
// xl:round 740
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域逐条一问的六条原子探针
// `p740b-b01` … `p740b-b06`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**一元前缀运算符与成员链 / 二元的结合**——`typeof o.p.q` 只取最后那一格、
// `delete` 落在成员与下标上、前后缀 `++` 打的是成员那一格、
// 一元的结果还能再取成员、一元比二元紧、`await` 与一元前缀同格。
//
// **块与块之间排空一次微任务队列**（第 798 轮实测的坑，b06 是异步的）。
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // b01 · `typeof` 打在成员链上
    const o: any = { p: { q: "s" } };
    console.log(typeof o.p.q, typeof o.p, typeof o.missing);
  }
  await drain();

  {
    // b02 · `delete` 打在成员与下标上
    const o: any = { p: 1 };
    const a: any = [1, 2];
    console.log(delete o.p, delete a[1], a.length, Object.keys(o).length);
  }
  await drain();

  {
    // b03 · 前缀 / 后缀 `++` 打在成员上
    const o: any = { n: 5 };
    console.log(o.n++, ++o.n, o.n);
  }
  await drain();

  {
    // b04 · 一元前缀的结果再取成员
    const s: any = "abc";
    console.log((!s).toString().length, (typeof s).length);
  }
  await drain();

  {
    // b05 · 一元前缀与二元的紧密度
    const o: any = { p: 2 };
    console.log(-o.p + 1, typeof o.p === "number", !o.p === false);
  }
  await drain();

  {
    // b06 · `await` 与一元前缀同格
    async function main() {
      console.log(-(await Promise.resolve(2)), typeof (await Promise.resolve("s")));
    }
    main();
  }
  await drain();
}
main();
