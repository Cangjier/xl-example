// xl:title `replace` 的替换值是函数：实参表与返回值那一趟
// xl:round 692
// xl:judge stdout
// xl:end
// **合并了原先同一个判定点的五条**（第 692 轮那一次并组）：
//   probe694-y01 · probe699-s-t05 · probe700-g-t01 · probe700-g-t02 · probe167-string-replace-function（同一族）
// 判定点只有一个：**回调拿到哪几个实参、它的返回值怎么进结果**——
//  ① 字符串模式下的实参表：`(匹配, 偏移, 整个串)`（**没有捕获组时是三个**，不是四个）；
//  ② 返回值过 `ToString` 接进结果；
//  ③ 回调对**每一处**各调一次（`replaceAll` 时）——这与「换几处」是两个面，所以同一条里对照。
// **第 812 轮记一笔**：`124-string-replace-dollar-and-function` 下盘时逐行核过，它那四行断言
// 逐条都在 `197`（`$&` / `replaceAll` 的记号按字面）与 `198`（记号那一族）里，所以它归那两条，
// 不在这条里重复留一份（函数形式那一面本条已经全覆盖）。
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
const s = "abc";

try {
  console.log(show(s.replace("b", (m: string) => m.toUpperCase())));
  console.log(show(s.replace("b", (m: string, off: number, whole: string) => m + off + whole.length)));
  console.log(show(s.replace("b", (m: string, off: number, whole: string) => m + "|" + off + "|" + whole)));
  console.log(show("aaa".replaceAll("a", (m: string) => m + m)));
  // 返回值不是字符串（过 ToString）
  console.log(show("abc".replace("b", (() => 7) as any)));
} catch (e) {
  console.log("throw:" + (e && (e as any).constructor ? (e as any).constructor.name : "?"));
}
