// xl:note 值位对象字面量的**计算属性名**里有 `in`（第 949 轮登记）。
// `const v = { [K in T]: X };` 与映射类型 `{ [K in T]: X }` **词法同形**——第一个实义单元
// 都是 `[K in T]`——分开它们的只有**位置**，而 `IsMappedKeyBracket` 那条「父单元是一个 `{`
// 括号、且本单元是它第一个实义单元」的判据把值位也放行了 ⇒ 值位那个 `in` 被当成映射键的标记，
// `K in T` 整段收成一个 `TypeParameter`（TS 那边是 `ComputedPropertyName` 里的
// `BinaryExpression{ InKeyword }`：缺 `BinaryExpression` / `Inkeyword` 各 1、多 2）。
// **试过、退回来的那一版**（如实记）：拿 `Bracket.Context`（开括号那一刻算好的位置）当判据，
// 只在它是 `"value"` 时判否 —— 片段探针当场 0 条对不上，可 `coverage` 立刻报出六条真映射类型
// 反过来坏了（`ty-mapped` / `ty-mapped-as-remap` / `gap-r869-mapped-modifiers-comment-1` /
// `gap-r922-mapped-modifier-space-before-colon` / `type-mapped-modifier-in-generic` /
// `type-combination-adversarial`）：多行 / 带修饰词 / 泛型实参里那几种排版，`Context` 答的是
// `"value"`（第 163 轮那条注释早就记过它不可靠），所以那一版按规矩撤回。
// 下一轮要的是**与 `TypeLiteralCloseRule.IsTypePosition` 同一份**位置判据（或把它挪到
// `text-common-util` 一层共用），不是再写第三份近似。
// 第 951 轮收掉（已知缺口）：位置那一问**没有**挪到 `text-common-util`（那会绕出环——
// `IsTypePosition` 自己要用 `Statement.IsLineBreakBoundary`），而是**留在 `type-literal.xl.md`**、
// 由 `TypeLiteralCloseRule.Instance.IsMappedKey` 把「形状 + 位置」两问合起来答；
// `type-parameter.xl.md` 的 `OwnerOf` / `Process` 与 `as.xl.md` 的 `Previous` 都改问它。
// **这一刻问得出来**：折叠发生在键括号**关掉那一刻**，那时外层 `{` 还没关闭、且正躺在宿主自己的
// 平列表里（`AddToMounted` 挂的）⇒ `type M<T> = {`（`=` 前隔着 `GenericType`）与
// `Promise<{ … }>`（泛型实参）那两种 `Bracket.Context` 答 `"value"` 的排版这一次都问得到「类型位」。
// `xl:expect ObjectLiteral:2,ArrayLiteral:2,BinaryOperator:1,As:1`
// `xl:absent TypeParameter`
// xl:end
const v = { [K in T]: X };
const w = { [K in T as `get${K}`]: X };
