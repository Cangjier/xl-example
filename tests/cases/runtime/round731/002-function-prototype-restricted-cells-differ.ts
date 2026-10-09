// xl:title `Function.prototype` 上那两格受限属性（`arguments` / `caller`）
// xl:round 731
// xl:judge stdout
// xl:why **第 899 轮收掉**（`coverage` 从 differ 转绿，`xl:want differ` 那一行按规矩撤了）——
// xl:why 这一条留着当**守卫**：`Function.prototype` 自己那两格受限属性在 Node 里
// xl:why `"arguments" in Function.prototype` / `hasOwnProperty` **都是真**，
// xl:why 第 731 轮时本仓给 `false false`。
// xl:why **根子**：`props.xl.md` 那两格是按闭包那一位（`HeapClosure.HasRestricted`）答的，
// xl:why 而 `protos.Function` 是一个**普通对象**（带一格可调用载荷）——没有闭包载荷可问，
// xl:why 于是「在不在」这件事与「读出来是什么」分成两个出口，两个都说假。
// xl:why **修法**：给这一处单开一条**按身份**的判据（「这个接收者是不是 `protos.Function`」，
// xl:why 句柄由调用方给）——`in` 那一支在 `HasProperty`（`props.xl.md`，第 4 个参数，
// xl:why 默认 `0` 表示「没给」）、`hasOwnProperty` 那一支在 `globals.xl.md`，
// xl:why **读**那一支在 `GetProperty`（同一个接收者给 `null`，与松散函数同一条口径）。
// xl:why **顺带修掉的是同一句话的另一半**：`"arguments" in function f() {}` 原来也是**假**
// xl:why（JS 给真）——`HasProperty` 只查属性表，而那两格不住在属性表里。
// xl:why **不许被带偏的那一半**：箭头 / 方法 / 生成器 / `async` / 类 / 严格代码
// xl:why **一个都没有**这两格（那一位由降级层量），属性表里那几格照旧。
// xl:why **仍开着的账**（不在这一条里）：那两格的**描述符**（Node 给访问器、
// xl:why 严格上下文一读就抛 `TypeError`），登在 `exec/round709/002` 那一族。
// xl:end
// 第 803 轮改名（原 `p731a-a10`）：`xl:want` / `xl:why` 与正文一字未动。
console.log("arguments" in Function.prototype, "caller" in Function.prototype);
console.log(Object.prototype.hasOwnProperty.call(Function.prototype, "arguments"));
