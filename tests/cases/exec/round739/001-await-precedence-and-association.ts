// xl:title `await` 与更紧的运算结合时的层级：算术、逻辑、比较、下标与成员链
// xl:round 739
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收同域逐条一问的六条原子探针
// `p739b-b01` … `p739b-b06`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**`await` 作为一元前缀的层级**——它只吞掉紧跟其后那一格
// （算术 / 乘法 / 逻辑 / 比较 / 下标与成员链都要算在 `await` 之外），
// 所以函数体 / 异步箭头 / 方法里那条表达式的结合方式与 Node 一致。
//
// **块与块之间必须排空一次微任务队列**（第 798 轮实测的坑）：不排空时两条承诺链
// 会交叉推进，读数就成了「并发形状」的读数、不再是各条原来那个判定点的读数。
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // b01 · `await` 与算术的层级
    async function f(): Promise<number> { return await Promise.resolve(1) + 1; }
    f().then((v) => console.log(v));
  }
  await drain();

  {
    // b02 · 方法里的 `await` + 逻辑
    class A {
      async m(): Promise<any> { return await Promise.resolve(0) || "d"; }
    }
    new A().m().then((v) => console.log(v));
  }
  await drain();

  {
    // b03 · 异步箭头里的 `await` + 乘法
    const f = async (x: any) => await x * 2;
    f(Promise.resolve(3)).then((v) => console.log(v));
  }
  await drain();

  {
    // b04 · 两侧 `await` 的加法
    async function main() {
      const v = await Promise.resolve(1) + await Promise.resolve(2);
      console.log(v);
    }
    main();
  }
  await drain();

  {
    // b05 · `await` 作实参与返回值的二元表达式
    async function pick(x: any, y: any) { return await x > await y ? "gt" : "le"; }
    pick(Promise.resolve(3), Promise.resolve(2)).then((v) => console.log(v));
  }
  await drain();

  {
    // b06 · `await` 与下标 / 成员链
    const box = { v: [Promise.resolve(5)] };
    async function main() {
      console.log(await box.v[0] + 1);
    }
    main();
  }
  await drain();
}
main();
