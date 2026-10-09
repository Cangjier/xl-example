// xl:title `console.log` 的多实参与格式说明符：空格相接、空调用、`%s` / `%d` / `%o` / `%%`
// xl:round 291
// xl:judge stdout
// xl:end
// **按判定点合并**：原先同判定点的 6 条并成这一条，
// 每一条的正文**逐字**搬进下面各自的 IIFE（打印口径与判据一字未动）：
//   · stdlib/console/001-console-log-args.ts
//   · stdlib/console/010-console-log-multi-forms.ts
//   · stdlib/console/031-con-log-multi-args.ts
//   · stdlib/console/032-console-format-specifiers.ts
//   · stdlib/console/probe703-c-h06.ts
//   · stdlib/console/probe703-c-h12.ts
//
// 这个域的每一块都是**同步**的 console.log 渲染，所以块与块之间不需要
// 排空微任务队列（第 798 轮那个壳）：合并后的 stdout 就是各条 stdout 的
// **顺次相接**（第 799 轮用尺子逐字节核过：8 条合并条的 stdout 与
// 各条单独跑的 stdout 顺次相接**逐字节相同**）。

// —— 并入自 stdlib/console/001-console-log-args.ts ——
(function () {
  console.log("a", "b", 1, true, null, undefined);
  console.log();
  console.log("only");
  console.log(1, 2);
})();

// —— 并入自 stdlib/console/010-console-log-multi-forms.ts ——
(function () {
  console.log(1, "a", true, null, undefined);
  console.log([1, 2], { a: 1 }, new Map([["k", 1]]));
  console.log();
})();

// —— 并入自 stdlib/console/031-con-log-multi-args.ts ——
//  xl:note 第 691 轮登记的缺口、**同一轮就收掉了**：`console.log` 的第一个实参是字符串
//       并且后面还有实参时，那个字符串是一张**格式串**（`util.format`）——
//       `%s` / `%d` / `%i` / `%f` / `%o` / `%O` 各消耗一个实参、`%c` 与 `%%` 不消耗，
//       认不出的说明符与「没有实参可消耗」两种都原样留着。
//       **`%j` 还没做**（要走 `JSON.stringify` 那一整支）——写在 `globals.xl.md` 那一处。
(function () {
  console.log("a", 1, { b: 2 });
  console.log("%s", "x");
  console.log();
  console.log(undefined, null, true);
})();

// —— 并入自 stdlib/console/032-console-format-specifiers.ts ——
(function () {
  console.log("%s-%d", "a", 1);
  console.log("%d%%", 50);
  console.log("%s", "x", "y");
  console.log("%o", 1);
  console.log("100%");
  console.log("%q", 1);
  console.log("%f", "1.5abc");
})();

// —— 并入自 stdlib/console/probe703-c-h06.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log("%s|%d", "x", 1.5);
})();

// —— 并入自 stdlib/console/probe703-c-h12.ts ——
(function () {
  const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
  console.log(1, "a", true);
})();
