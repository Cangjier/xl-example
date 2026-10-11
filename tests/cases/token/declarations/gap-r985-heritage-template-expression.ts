// xl:note 继承子句里的模板串：整条类照常成形（`extends` 后面那一格是 `String`）
// （第 985 轮登记的缺口，第 1203 轮收掉：`class.xl.md` 的 `ClassBranch.ScanHead`
//   原来只认 `Identifier` 与 `Bracket` 两种实体名，模板串那一格被当成「这不是一个类头」。）
class D extends `a${X}b` {}
