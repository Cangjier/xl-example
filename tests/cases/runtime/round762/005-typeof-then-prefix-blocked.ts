// xl:title `typeof` 后面紧跟 `void` / `!`：那个 `typeof` 被投成了 `Identifier` ⇒ 整份文件进不来
// xl:round 762
// xl:judge stdout
// xl:want blocked
// xl:why **量出来的形状**（第 762 轮普查当场红的那一行）：`typeof void 0` 与 `typeof !0`
// xl:why 在 Node 里分别是 `"undefined"` 与 `"boolean"`，本仓**整份文件一个字节都不跑**——
// xl:why 降级期报 `name is not a local or a capture: typeof`。
// xl:why **同一个形状里 `typeof -1` 一直是好的**（给 `"number"`）：差的是**第二个词是不是符号**。
// xl:why 产物那一侧量到的形状是：`typeof !0` 里那个 `typeof` **没升成 `Keyword`**、
// xl:why 停在一个 `Identifier` 上，于是 `projectUnary` 按 `op` 属性找运算符那一格找不到它，
// xl:why 那个词就被当成**操作数**投了出去（`UnaryOperator(op="typeof")` 里面又装了一层
// xl:why 别的节点，`typeof` 自己成了一格标识符）——**它与 `typeof -1` 这一格的分界**
// xl:why 是「`!` / `void` 都是前缀词」，而 `-` / `+` 是符号。
// xl:why **为什么这一轮不顺手收**：那条线在 token 层的重组深度上（第 496 轮那道
// xl:why `Depth >= 8` 的硬界 + `KeywordCloseRule` 排在最后——与第 550 轮 `in` / `instanceof`
// xl:why 停在 `Identifier` 是同一个根），改它要连带重跑 1414 份 token 语料。
// xl:why **先如实登记，不猜**。
// xl:end
console.log("1", typeof void 0);
console.log("2", typeof !0);
console.log("3", typeof -1);
