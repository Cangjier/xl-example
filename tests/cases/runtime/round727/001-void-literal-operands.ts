// xl:title `void` 后面跟对象 / 数组 / 括号字面量，以及**类型位**的 `void` 照旧
// xl:round 727
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收 `p727a-a01` … `a05` 五条，外加
// `runtime/round726/p726a-b01`（第 726 轮登记、第 727 轮当场转绿的那一格，
// 与这里同一条根）与 `runtime/round729/p729a-a03`（`void` 的更多位置），正文逐句搬进各自的块里。
// 判据只有一条：**`void` 后面那一格按值解析**（对象 / 数组 / 括号都要成字面量、结果是 `undefined`），
// 而**类型位的 `void` 一个都不许动**（函数返回类型 / 类方法 / 回调类型 / `type V = void` /
// `void[]` / 接口签名）——a04 那一块就是这条规则的守卫。
//
// **块与块之间排空一次微任务队列**（a05 是异步的）。
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // a01 · `void` 后面跟对象字面量
    const a = void { v: 1 };
    console.log(a);
    console.log(void { v: 2 });
    const arr = [void { v: 3 }, void { v: 4 }];
    console.log(arr.length, arr[0], arr[1]);
  }
  await drain();

  {
    // a02 · `void` 后面跟数组字面量
    console.log(void [1, 2]);
    const b = void [3, 4, 5];
    console.log(b);
    const f = (): any => void [6];
    console.log(f());
  }
  await drain();

  {
    // a03 · `void` 在实参 / `return` / 三元 / 逻辑位置
    function g(): any { return void [1]; }
    console.log(g());
    console.log(true ? void { a: 1 } : 2);
    console.log((void { a: 1 }) === undefined, (void [1]) === undefined);
    console.log([1].map(() => void { k: 1 }).length);
  }
  await drain();

  {
    // a04 · **类型位**的 `void` 照旧（守卫）
    function f(): void { const t = 1; console.log("f", t); }
    f();
    class C { m(): void { console.log("m"); } }
    new C().m();
    const cb: () => void = () => { console.log("cb"); };
    cb();
    type V = void;
    let xs: void[] = [];
    console.log(xs.length, cb !== undefined);
    interface I { go(): void; }
    const o: I = { go(): void { console.log("go"); } };
    o.go();
  }
  await drain();

  {
    // a05 · `void` 与其它前缀词并排 / 嵌套
    console.log(void void 0);
    async function h(): Promise<any> { return await void { z: 1 }; }
    h().then((v: any) => console.log("h", v));
    console.log(typeof void { q: 1 });
    console.log(!void [9]);
  }
  await drain();

  {
    // 726-b01 · `void` 后面跟括号字面量（第 726 轮登记、第 727 轮收掉）
    console.log(void { v: 1 });
    console.log(void [1, 2]);
    console.log(typeof void 0);
  }
  await drain();

  {
    // 729-a03 · `void` 的更多位置（分组 / 嵌套 / 与 `typeof` 并排）
    console.log(void (0), void (1 + 2));
    console.log((void 0) === undefined);
    const f = function (): any { return void [1, 2]; };
    console.log(f() === undefined);
    console.log(typeof void 0, typeof (void 0));
    console.log([void 0, void 0].length);
  }
  await drain();
}
main();
