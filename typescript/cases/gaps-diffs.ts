// 剩余 AST diff 修复的守卫（task-74）：export 括号化 moduleSpecifier、new + 标签模板、类成员 `[` 续接
// 一行一用例；多行形用行内 `\n`（ast-json 会还原）。
const n1 = new f<T>`t`;
const n2 = new f<T>`t`.b;
const n3 = new f<T>`t`(1);
const n4 = new Map<string, number>();
const n5 = new f<T>;
export { a }\nfrom("m");
class C { [KEY] = 1\n["s" + "t"] = 2 }
class D { [KEY] = 1; \n["s" + "t"] = 2 }
