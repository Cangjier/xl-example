// xl:note 类型位的 `null` / `true` 在产物里是裸标识符时，投影层要按 TS 的形状套一层 `LiteralType`（`undefined` 不套）；这条用例钉住产物那一侧的形状，投影的成绩由 `cases:tsast` 与 samples 的 TS 形状夹具量。
// xl:expect LiteralType:2,UnionType,Identifier:3
// xl:absent Keyword
type X = null | undefined | true;
