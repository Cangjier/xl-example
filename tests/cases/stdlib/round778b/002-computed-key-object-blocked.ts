// xl:title 计算键里放一个对象：`ToPropertyKey` 是「先 `ToPrimitive`」
// xl:round 778
// xl:judge stdout
// xl:want blocked
// xl:why **量出来的形状**（第 778 轮第二普查当场红的那一行）：`const k = { toString() { return "kk" } };`
// xl:why `const o = { [k]: 1 }` 在 Node 里给 `o.kk === 1`，本仓报
// xl:why `unimplemented: ToString of this kind of value`（**整份文件进不来**）。
// xl:why **根在那一句话住着两份**：`vm.xl.md` 的 `PropertyKeyOf`（引擎那一侧）对对象会回调
// xl:why `PropertyKeyHookId`（`set_index` / `get_index` 走的就是它，所以 `o[k]` 那种写法
// xl:why 一直是好的，第 750 轮收的），而 `define_data` 那一格（`install.xl.md`）
// xl:why 把同一份规矩**照抄在语言层**、用的是 `RtToString`——那对**对象**响亮地抛
// xl:why （引擎那一层的口径写着「对象要 `ToPrimitive`，那是建库层的事」）。
// xl:why **分界由同一条用例的其余档钉着**：字符串键 / 数字键 / 符号键三条路走同一格、
// xl:why **全对**（`stdlib/round778b/r778j-01` 第 05 行）；差的只是「键是对象」这一档。
// xl:why **为什么不顺手收**：`define_data` 的调用方是**语言内建**，手上只有 `table` / `room`，
// xl:why 拿不到 VM 实例（`CallHostValue` / `PropertyKeyHookId` 都在引擎那一侧）——
// xl:why 要收得先把「对象 → 属性键」这条规矩挪到一处（现在是引擎一份、语言一份），
// xl:why 那是一次重构，不是修一处笔误。**先如实登记，不猜。**
// xl:end
const k: any = { toString() { return "kk"; } };
const o: any = { [k]: 1 };
console.log('01 对象键走 toString', o.kk, Object.keys(o).join(","));
const boxed: any = { [new Set()]: 2 };
console.log('02 对象键走默认 toString', boxed["[object Set]"]);
