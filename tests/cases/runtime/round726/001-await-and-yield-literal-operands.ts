// xl:title `await` / `yield` / `delete` 后面跟对象 / 数组字面量（值位与类型位的分界）
// xl:round 726
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域逐条一问的四条原子探针
// `p726a-a01` … `a04`，正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**前缀词后面那个 `{` / `[` 是值位的字面量**——
// `await` / `yield` / `delete` 的操作数位置上，`{…}` 与 `[…]` 要按值解析，
// 不能被读成类型或块；`delete` 后面跟下标那一格是这条规则的守卫（照旧要能删）。
//
// **块与块之间排空一次微任务队列**（第 798 轮实测的坑）：a01 / a02 是异步的，
// 不排空时两条承诺链会交叉推进。`await` 只加在块**之间**，块里的正文一行没改。
async function drain(): Promise<void> { for (let i = 0; i < 200; i++) await null; }

async function main() {
  {
    // a01 · `await` 后面跟对象字面量
    async function asStatement() { await { v: 1 }; return "statement"; }
    asStatement().then((x: string) => console.log(x));
    (async () => { const o: any = await { v: 2 }; console.log("init", o.v); })();
    const arrow = async () => await { v: 3 };
    arrow().then((o: any) => console.log("arrow", o.v));
    async function returned() { return await { v: 4 }; }
    returned().then((o: any) => console.log("return", o.v));
    async function nested() { return (await { v: 5 }).v; }
    nested().then((v: number) => console.log("nested", v));
  }
  await drain();

  {
    // a02 · `await` 后面跟数组字面量 / 括号表达式
    (async () => {
      console.log("array", (await [1, 2]).length);
      console.log("paren", await (1 + 2));
      console.log("deep", (await Promise.resolve({ v: 6 })).v);
      const both: any = await [{ v: 7 }];
      console.log("inArray", both[0].v);
    })();
  }
  await drain();

  {
    // a03 · `yield` 后面跟对象 / 数组字面量
    function* g() { yield { v: 1 }; yield [2, 3]; }
    const seen: string[] = [];
    for (const x of g()) seen.push(JSON.stringify(x));
    console.log(seen.join("|"));
    function* delegating() { yield* [{ v: 4 }]; }
    console.log(JSON.stringify([...delegating()]));
  }
  await drain();

  {
    // a04 · `delete` 后面跟方括号（下标删除照旧）
    const o: any = { a: 1, b: 2 };
    console.log(delete o["a"], JSON.stringify(o), "a" in o);
    const arr: any = [1, 2, 3];
    console.log(delete arr[1], 1 in arr, arr.length);
    console.log(delete ({ x: 1 } as any)["y"]);
  }
  await drain();
}
main();
