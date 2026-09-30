// xl:note 计算成员名：标识符与字符串字面量作字段名
// xl:expect Class,ClassBody
const KEY = "k"
class C {
  [KEY] = 1
  ["s" + "t"] = 2
}
