// xl:known-gap 第 971 轮普查量到：`isCallFirstUnit` 的 `Method` 那一支只认「第一格是实参括号 / 断言盖着实参括号」，而这一格的第一格**又是 `Method`** ⇒ 链那一支整个进不来。
// xl:round 971
// 第 971 轮把第 964 轮那三格收掉之后，按本仓「清单空着就换一批底样再量一遍」的规矩，
// 拿 30 条同族片段（调用 / 可选链 / 非空断言 / 下标，两层到四层）普查量的
//（`node tests/parse/ts-ast.mjs --snippets tmp/r971-family.mjs`，30 条里 2 条对不上）。
//
// **token 树**（`cjcli` 实测）：
//
//     [NotNull([a, !]),
//      PropertyAccess([Method(name="")[Method(name="")[Bracket(())]]], ., Identifier(c))]
//
// 注意**只有两格 `Method` 加一格 `Bracket`**，可它说的是**三次调用**
//（`a!()` / `a!()()` / `a!()()()`）——第 966 轮那格 `Method(name=""[Bracket(())])`
// 就已经是「一格说两次调用」，这一条是它的下一层。
//
// **走到哪**（片段探针的读数）：产物只剩一个盖到 `a!` 的 `NonNullExpression`——
// 缺 `PropertyAccessExpression` / 三个 `CallExpression` / `Identifier(c)`，共 **5** 格。
// 症状与第 971 轮修掉的那条（`a!()().c`，缺 4）一模一样，可卡的位置**低一层**：
// 上一条那一格 `Method` 的头一格是 `Bracket`（`isCallFirstUnit` 认了），
// 这一格的头一格**是另一格 `Method`** ⇒ 那一支答否 ⇒ 链那一支整个进不来。
//
// **下一处入手处**：`isCallFirstUnit` 的 `Method` 那一支再问一句「第一格是不是 `Method`」
//（递归问它——`Method` 是完整单元，与「平级的裸 `(` 兄弟」不是一件事）。
// 入口放开之后还要重量**层数**：链循环里「空名字 `Method`」那一档（第 966 轮立的
// 两支 + 第 971 轮的 `graftCallee`）按**区间**判「外面还有没有一层」，
// 而这一格是「两格 `Method` 说三次调用」，层数要按 `endOf` 量、不能按格数数。
// 第 971 轮只量到这里，没有动判据（如实登记，不猜）。
// xl:end
a!()()().c;
