// xl:note 模板字面量作计算字段名，且带插值
// xl:expect Class,ClassBody
const KEY = "k"
class C {
  [`${KEY}2`] = 1
}
