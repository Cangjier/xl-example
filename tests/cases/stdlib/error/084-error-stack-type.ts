// xl:title `new Error("m").stack` 是字符串（不是 undefined）
// xl:round 697
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的两条**（逐字节相同的原子探针）：probe697-e11 · probe704-e-a38。
//
// 判定点只有一个：**错误对象上 `stack` 那一格存在且是字符串**——
// `typeof new Error("m").stack` 给 `"string"`（第 725 轮起本仓自己挂的那一格，
// 见 `078-*` 那一族）；这一条只钉「它在、而且是字符串」，栈内容本身不是判据。
//
// **修改记录（第 783 轮合并时）**：这两条原来**没写 `// xl:end` 终止行**，
// 于是文件头被读到文件尾、**正文一个字都没跑**——覆盖度里它们是**空跑**（恒 pass）。
// 补上终止行之后判据才真的生效。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));

try {
  console.log(show(typeof new Error("m").stack));
  console.log(show(typeof new TypeError("t").stack));
  console.log(show("stack" in new Error("m")));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
