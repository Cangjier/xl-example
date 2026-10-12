// xl:title 可选调用**返回函数**再调用
// xl:round 741
// xl:judge stdout
// xl:note 第 962 轮转绿（`xl:want blocked` 与台账按规矩撤掉，用例留着当守卫）：
// `o?.m()()` / `o?.m?.()()` 那一格原来投出一个**名字为空**的属性访问
//（`NCO[Method name=""[Method name="m"]]` 落到「按成员名折」那一支），
// 交出的是方法本身 ⇒ 再调一次报 `cannot call a non-closure value`（整份文件断在这里）。
//
// **根因是同一份判据的四处副本**（[`print-ast-common.xl.md`](../../../../typescript/print-ast-common.xl.md)）：
// 「名字 + 调用」这一折在普通链那条路（第 366 轮）有「名字为空 ⇒ 两步走」那一支，
// 而 `chainWithOptional`、`chainOnto` 与链基那一支**各自只认了 `NotNull` 一半**（第 852 轮）——
// 于是同一形状在四处给出两种答案。
//
// **修法**：四处补齐同两支（内层是 `Method` ⇒ 第 366 轮那两步走；内层是实参括号 ⇒
// 判据是**区间**：`Method` 比它那个 Bracket 更靠右，说明外面还有一层调用）。
// xl:end
// 本文件是 `p741a-a09` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

const o: any = { m() { return () => "inner"; } };
console.log(o?.m()());
console.log(o?.m?.()());
const n: any = null;
console.log(n?.m?.());
