// xl:title 回调里**再进一次**原生回调并且抛出：异常要一路穿回最外层（**还没修**）
// xl:round 374
// xl:judge stdout
// xl:end
// f 在 .map 的回调里**递归**，而递归那一层又进了一次 .map——
// 也就是「脚本 → 原生 → 脚本 → 原生」这条链。
// 这一条**还没修**：异常从重入那一层出来之后没有穿回最外层的 try。
function walk(n: number): number {
  if (n === 0) throw new Error("bottom");
  return [n].map((x) => walk(n - 1))[0];
}
try { walk(3); console.log("no throw"); } catch (e) { console.log("A caught", (e as Error).message); }
function plain(n: number): number { if (n === 0) throw new Error("plain-bottom"); return plain(n - 1); }
try { plain(3); } catch (e) { console.log("B caught", (e as Error).message); }
console.log("done");
