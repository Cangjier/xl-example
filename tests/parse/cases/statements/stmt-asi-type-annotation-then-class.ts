// xl:note 类型标注之后的换行是语句边界：`class C {}` 不该被吞进 TypeDefine
// xl:expect Statement:1,Class:1,TypeDefine:2
let a!: number
class C { x!: number }
