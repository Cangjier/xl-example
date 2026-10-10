// xl:note 第 975 轮收掉：`a!()()()()`：两格 `CallExpression` 原来漂到 `[0,10)`——同一处：空名字 `Method` 套三层时每一层都要各投一格。`projectExpression` 链循环里那一档改成「走到最里面那一格再让整串壳套上去」（`innermostMethod` + `innermostCallee` + `graftCallee`），四层调用全就位。
// xl:round 973
// 第 973 轮把第 971 轮登记的那两格收掉之后，缺口清单空着，于是按本仓「清单空着就换一批底样再量一遍」
// 的规矩，另拿 30 条同族片段（调用 / 可选链 / 非空断言 / 下标；层数比第 971 轮那一批深一到两层，
// 另把「断言 + 下标」与「断言 + 调用」的组合摆进去）普查了一遍：
// `node tests/parse/ts-ast.mjs --snippets tmp/r973-family.mjs`——30 条里 **13 条对不上**，
// 这一条是其中之一（读数写在第一行）。按规矩**先登记、不猜**：用例进语料，缺口走 `xl:known-gap` 那条账。
// xl:end
a!()()()();
