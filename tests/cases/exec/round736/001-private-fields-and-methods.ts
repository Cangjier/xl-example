// xl:title 私有字段 / 私有方法 / `#x in o` / 静态私有：它们都不是自有属性名
// xl:round 736
// xl:judge stdout
// xl:end
// **按判定点并组（第 802 轮）**：吸收 `exec/round736/p736c-c03` 与
// `exec/round737/p737d-d02` 两条原子探针（同一个判定点被写了两遍），
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**私有名不进属性表**——`#p` / `#m` / 静态 `#sp` 能被自己人读到、
// `#p in o` 是品牌检查（别人的对象给 `false`），而 `getOwnPropertyNames` / `keys` /
// `JSON.stringify` 一个私有名都不露；`{"#p": 9}` 那种**同名字符串键**是普通自有属性。
{
  // c03 · 私有字段 / 私有方法 / `#x in o` / 静态私有
  class A {
    #p = 1;
    static #sp = 2;
    #m() { return this.#p + 1; }
    has(o: any) { return #p in o; }
    run() { return this.#m(); }
    static getSp() { return A.#sp; }
  }
  const a = new A();
  console.log(a.run(), a.has(a), a.has({}), A.getSp());
  console.log(Object.getOwnPropertyNames(a).join(","));
  console.log(Object.getOwnPropertyNames(A.prototype).join(","), typeof (a as any).run);
}

{
  // d02 · 私有字段不是自有属性名（`getOwnPropertyNames` 与 `keys` 同口径）
  class A {
    #p = 1;
    static #sp = 2;
    #m() { return this.#p + 1; }
    run() { return this.#m(); }
    static getSp() { return A.#sp; }
  }
  const a = new A();
  console.log("names:" + Object.getOwnPropertyNames(a).join(","));
  console.log("keys:" + Object.keys(a).join(","), JSON.stringify(a));
  console.log(Object.getOwnPropertyNames(A.prototype).join(","), a.run(), A.getSp());
  const o: any = { "#p": 9 };
  console.log(Object.getOwnPropertyNames(o).length, Object.keys(o).length);
}
