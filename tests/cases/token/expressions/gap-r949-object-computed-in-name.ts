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
// xl:known-gap 值位计算属性名里的 `in` 被当成映射键（本文件两条共缺 11 多 4：不带 `as` 的那条缺 2 多 2、带 `as` 键重映射的那条缺 9 多 2）
// xl:end
const v = { [K in T]: X };
const w = { [K in T as `get${K}`]: X };
