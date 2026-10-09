// xl:title `String.raw`：标签模板的 `raw` 那一栏与 `{ raw: […] }` 那一档
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的八条**：
//   probe3-y04 · probe699-s-t02 · probe157-string-raw-r683 · probe164-template-raw-escape
//   ＋ `037-string-raw-and-tagged` / `074-string-raw-r323` / `098-string-raw-r371`（同一件事的三份）
//
// 判定点只有一个：**`String.raw` 取的是 `raw` 那一栏（转义不生效）**——
//  ① 标签模板：`` String.raw`a\nb` `` 给**两个字面字符** `\` 与 `n`，不是换行；
//  ② 普通调用那一档：`String.raw({ raw: ["x", "y"] }, 1)` 按替换位插值；
//  ③ 标签拿到的第一个实参上 `raw` 与 `0` 是两个不同的串（`\t` 那一格）；
//  ④ 插值个数与 `raw.length - 1` 对得上。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const tag = (s: any, ...v: any[]): string => s.raw[0] + "|" + s[0] + "|" + v.length;

try {
  console.log(show(String.raw`a\nb`));
  console.log(show(String.raw({ raw: ["x", "y"] }, 1)));
  console.log(show(tag`a\tb${1}c`));
  console.log(show(String.raw`a\nb`.length));
  console.log(show(String.raw`a\nb` === "a\\nb"));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
