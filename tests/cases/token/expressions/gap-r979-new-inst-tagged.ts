// xl:note 第 980 轮收掉：根因**不在** `IsAllowedFollower` 的表达式位（第 977 轮已经收下反引号），
//        而在**类型位那一张表**——`new` 在 `IsTypePosition` 的类型词表里（为了构造签名
//        `new (a: number) => A` / `new <T>() => T`），于是表达式位的 `new f<T>` 被回扫判成**类型位**，
//        而后继是反引号时那张表（名字与类型收尾）放不下它 ⇒ `<…>` 退回裸符号、整条标签模板塌。
//        两处修法（都在解析/投影层）：
//        （一）`IsAllowedFollower` 的**类型位**那张表补 `case "`"`——类型位里反引号本来接不上任何东西
//        （`type X = F<T>`t`` 不是合法类型），而能走到这一格的合法形状（`new f<T>`t`` / `x as F<T>`t``）
//        在 TS 里都是标签模板；
//        （二）`New.PrintAst` 里「`<…>` 归谁」补一问：紧跟 `GenericType` 的那一格是反引号模板时，
//        这一段归**被构造者**（TS 的外层 `NewExpression` 只有 `expression`，`typeArguments` 挂在
//        里面那层 `TaggedTemplateExpression` 上），只有它是 `name` 段最后一个实义单元时才是
//        `New` 自己的实参段（`new Map<string, number>()` 那一族一字未动）。
// xl:round 979
// 原来登记的那一句：`new f<T>`t``：投影那一层已经能把「`callee<…>` + 模板串」合成标签模板了（第 979 轮），
//        可这一条**到不了那里**——token 层 `new` 那一趟不认配对 `>` 后面紧跟的反引号，`f<T>` 根本没成形
//        （产物是 `BinaryExpression(BinaryExpression(New(f), <, T), >, `t`)`，缺 2 漂 1 多 5）。
// xl:end
const a = new f<T>`t`;
const b = new f<T>`t`.b;
const c = new f<T>`t`(1);
const d = new f<T>;
const e = new Map<string, number>();
const g = new f<T>();
