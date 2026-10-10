// xl:note `new f<T>`t``：投影那一层已经能把「`callee<…>` + 模板串」合成标签模板了（第 979 轮），
//        可这一条**到不了那里**——token 层 `new` 那一趟不认配对 `>` 后面紧跟的反引号，`f<T>` 根本
//        没成形：产物是 `BinaryExpression(BinaryExpression(New(f), <, T), >, `t`)`（缺 2 漂 1 多 5），
//        TS 那边是 `NewExpression > TaggedTemplateExpression{ tag: Identifier(f), typeArguments, template }`。
//        根因量到了一半：`new f<T>(1)` 那一格（后继是 `(`）是成的，后继是反引号时不成——
//        下一处入手处是 `new` 单元认泛型实参那一格的**后继闸**（`generic-type.xl.md` 的
//        `IsAllowedFollower` 表达式位已经收下反引号，所以问题在 `new` 那条路的入口）。
// xl:round 979
// xl:known-gap `new f<T>`t`` 里 `f<T>` 没成形（`new` 那一趟不认后继是反引号），标签模板整片塌
// xl:end
const a = new f<T>`t`;
