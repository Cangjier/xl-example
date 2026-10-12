// xl:note 第 972 轮收掉：**两处判据各缺一句**——入口 `isCallFirstUnit` 的 `Method` 那一支
// 不认「头一格又是一格 `Method`」（这一句第 971 轮的「下一处入手处」就点到了，补上之后
// 缺 5 → **缺 0 漂 1**：链进得去了，可三次调用只折出两次）；补上的是链里那一支
// ——`projectExpression` 的链循环里「空名字 `Method` 套空名字 `Method`」那一档
//（`bareName === "" && callHead Method && callHead 名字也是空`）只投了**一次**里层调用，
// 而那个 `callHead` 自己也是「一格说两次调用」。补法与同段下面那一支一字不差
//（`endOf(头) < endOf(这一格)` ⇒ 先把「括号那一次」建成最里面那一格）。
// 两处到位之后三次调用的区间 `[0,4) / [0,6) / [0,8)` 各就各位，那一行 `xl:known-gap`
// 按规矩撤掉，用例留着当守卫。
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
// **第 971 轮量出的读数**（当时登记的缺口）：产物只剩一个盖到 `a!` 的 `NonNullExpression`——
// 缺 `PropertyAccessExpression` / 三个 `CallExpression` / `Identifier(c)`，共 **5** 格。
// 症状与第 971 轮修掉的那条（`a!()().c`，缺 4）一模一样，可卡的位置**低一层**：
// 上一条那一格 `Method` 的头一格是 `Bracket`（`isCallFirstUnit` 认了），
// 这一格的头一格**是另一格 `Method`** ⇒ 那一支答否 ⇒ 链那一支整个进不来。
//
// **第 971 轮记的「下一处入手处」两句话，第 972 轮逐句验证**：
//
//   1. 「`isCallFirstUnit` 的 `Method` 那一支再问一句『第一格是不是 `Method`』（递归问它）」——
//      **对**：补上这一句之后链进得去了（缺 5 → 0）。
//   2. 「入口放开之后还要重量**层数**」——**也对，而缺层的地方不在 `chainOnto`**：
//      第 972 轮先在 `chainOnto` 的 Method 分支补了一版「最里面那一格也盖着两层」，
//      插桩实测**那一支根本没进**（`chainOnto` 的 `deepHead` 打印一次都没出现）——
//      这个形状走的是 `projectExpression` 的**链循环**（`ck` 那一份，与 `chainOnto` 同形不同处），
//      于是那一版按规矩撤回，改在链循环里 `bareName === "" && callHead` 名字也是空 那一档。
//      两处到位之后探针转绿；`chainOnto` 那一版**没有留下**（它是死代码，不写没量到的东西）。
// xl:end
a!()()().c;
