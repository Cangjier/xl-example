// xl:note 三种模块名（标识符 / 点号 / 引号）与 `global` 的位置全部由 token 的 `nameRange` 说清：
//       点号名的**里层不带修饰词**（`declare module a.b.c` 只有外层有 `modifiers`），
//       外层名字是 `Identifier(a)`、里层各是自己那一段（第 646 轮修）
// xl:expect Namespace:9,NamespaceBody:5,NamespaceExport:1
// xl:absent LineWrap:9
namespace A.B.C {
  export const v = 1;
}
declare module a.b.c {
  export const w = 2;
}
declare module "pkg/sub" {
  export const x = 3;
}
declare global {
  interface Window { y: number }
}
namespace Flat { export const z = 4; }
export as namespace A;
