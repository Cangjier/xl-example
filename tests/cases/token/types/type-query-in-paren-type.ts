// xl:note 括号类型里的交叉与 `typeof`：括号那一格按前文判成类型位后，两者都成形了
// xl:expect IntersectionType,Keyword
// xl:absent UnaryOperator
interface I {
  readonly defaultView: (WindowProxy & typeof globalThis) | null
}
