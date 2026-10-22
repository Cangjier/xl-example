// xl:note 第 1244 轮普查量出的一格（用户口径 1.1）：**泛型构造签名后面那个返回类型字面量**。
//
// `type T = new <A>(a: A) => { b: A };` 在 TS 那边返回类型是 `TypeLiteral`；
// 产物那一列是**缺 3 多 2** —— `{ b: A }` 被收成 `<Block>`（外加一格 `ColonToken`），
// `TypeLiteral` / `PropertySignature` / `TypeReference` 三个一起丢。
//
// **根因是 `IsTypePosition` 里 `new` 那一档的第二个量**（`crossedUnit`）：那一档的判据是
// 「`new` 与这个 `{` 之间有没有**跨过实义单元**」——有就说明这是 `new` **表达式**（值位）、
// 没有才是**构造签名**（类型位）。可 `new <A>(a: A) => { … }` 里，`new` 与返回类型那个 `{`
// 之间**确实跨过了 `<A>`**（泛型段那一支把 `crossedUnit` 置真），于是答「值位」。
//
// **两个量说的不是同一件事**：`crossedUnit` 要问的本来是「`new` 后面还有没有**被构造者**」
// （`new Box({ … })` 的 `Box`），而泛型类型参数表 `<A>` 是**构造签名自己的一部分**、
// 不是被构造者。这一格要修的是那个量的含义（`new` 后面紧跟的是 `(` 或 `<…>(` 时，
// 它一律是构造签名），不是再补一张名单。
//
// 实测同一族另两档**本来就是对的**（都在这份用例里当守卫）：不带泛型的
// `type U = new (a: A) => { b: A };`（`new` 后面紧跟 `(` ⇒ `crossedUnit` 假）与
// 不带返回类型的 `type V = new <A>(a: A) => void;`（那个 `{` 根本不存在）。
//
// 该格后来已修复：泛型构造签名后面的返回类型字面量现在收成 `TypeLiteral`（`crossedUnit`
// 不再把 `<A>` 算成被构造者），按规则已撤掉 `known-gap` 指令。
// xl:expect TypeLiteral:1
// xl:absent Block
type T = new <A>(a: A) => { b: A };

type U = new (a: A) => { b: A };

type V = new <A>(a: A) => void;
