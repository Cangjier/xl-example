// xl:note 基线用例（来自缺口审计语料）
// xl:expect MappedType
type M<T> = {
  [K in keyof T as `get${K & string}`]-?: () => T[K]
}
type N<T> = {
  -readonly [K in keyof T]+?: T[K]
}
