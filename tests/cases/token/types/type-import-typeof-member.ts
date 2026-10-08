// xl:expect Interface,InterfaceBody,Field,Keyword
// xl:absent MethodDeclaration
// xl:note 成员类型是「模块查询类型」`typeof import("a")` 时，后续成员不能被吞掉：
// `import` 不能当方法名（否则 `import("a")` 被收成 MethodDeclaration，它的尾部扫描把后面所有成员一起吃光）。
// 真实的 process.d.ts `interface BuiltInModule` 就是这种写法，112 个成员曾经只活下来 1 个
interface M {
  "a": typeof import("a")
  "b": typeof import("b")
}
