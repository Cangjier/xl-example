// xl:note 第 929 轮片段普查量到的一格：被标语句是**调用**时，名字与 `(` 之间换行。
// xl:round 930
// 第 930 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：根因在
// `text-common-util.xl.md` 的 `HasTypeColonBefore` —— 往回扫时先撞上的那个 `:` 是**标签冒号**
// （`done` 这个名字处在语句开头），可它一律照「类型标注」答 ⇒ 下一行那个 `(` 被判成
// 「新起一条语句」⇒ 换行处收壳、`f` 与调用括号分家（TS 那边是一个 `CallExpression`）。
// 现在那一支问一句 `IsLabelColon`（与 `IsObjectLiteralBrace` 里原来内联的那一份收成同一格），
// 标签冒号不再算类型标注；`let a: f` 换行 `()` 那种真类型标注的名字前面是 `let`，一个字都不变。
// xl:expect Label,Method
// xl:end
done: f
();
