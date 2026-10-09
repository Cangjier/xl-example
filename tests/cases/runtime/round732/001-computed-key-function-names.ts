// xl:title 计算键方法的 `name`：字面量键当场知道、动态键运行期补（含访问器与类成员）
// xl:round 732
// xl:judge stdout
// xl:end
// **按判定点并组（第 803 轮）**：吸收同域四条原子探针 `p732a-a01` … `a04`，
// 正文逐句搬进各自的块里，打印口径与探针一字不差。
// 判据只有一条：**计算键那份函数的名字**——字面量键（`["c"]` / `[5]`）在降级期就知道、
// 动态键（`["k" + 1]`）由运行期补写，对象字面量与类成员走同一个形状，
// 访问器要带上 `get ` / `set ` 前缀，属性值是箭头 / 函数表达式那一档同样补名字。
// （a02 / a03 的头里那段「第 755 轮收掉了」是**历史记录**：台账已撤，这两块留着当守卫。）
{
  // a01 · 计算键方法的 `name`（字面量键当场知道、动态键运行期补）
  const o = { ["c"]() {}, [5]() {}, ["k" + 1]() {} };
  console.log(o.c.name, o[5].name, o.k1.name);
  console.log(o["c"], o[5]);
}

{
  // a02 · 计算键访问器的名字（`get c` / `set c`）
  const o = { get ["g"]() { return 1; }, set ["s"](v: number) {}, get ["x" + "y"]() { return 2; } };
  const dg = Object.getOwnPropertyDescriptor(o, "g") as any;
  const ds = Object.getOwnPropertyDescriptor(o, "s") as any;
  const dx = Object.getOwnPropertyDescriptor(o, "xy") as any;
  console.log(dg.get.name, ds.set.name, dx.get.name);
}

{
  // a03 · 类里计算键方法的名字
  class C { ["m"]() { return 1; } static ["s"]() { return 2; } ["n" + 1]() { return 3; } }
  console.log(C.prototype.m.name, C["s"].name, C.prototype.n1.name);
}

{
  // a04 · 计算键属性赋的值那份函数（箭头 / 函数表达式那两档）
  const o = { ["c"]: () => 1, [5]: function () { return 2; }, ["k" + 1]: () => 3 };
  console.log(o.c.name, o[5].name, o.k1.name);
}
