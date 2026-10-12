// xl:note 成员名的四种形态（第 78 轮）：产物这一侧的名字有引号名 / 数字名 / 计算名三种来源（分别靠 `quotedModuleNameSpan` 的引号判据、`NUMERIC_LITERAL`、`computedNameUnit` 认），投影层收在 `memberNameOf` 一份里——接口 / 类型字面量成员原来走 `projectField`，只会合成一个 `Identifier`。
// xl:expect Field:4,ArrayLiteral:2,PropertyAccess,TypeDefine:4
interface I {
  "a-b"?: string;
  0: number;
  [kOptions]: T;
  [Symbol.toStringTag]: string;
}
