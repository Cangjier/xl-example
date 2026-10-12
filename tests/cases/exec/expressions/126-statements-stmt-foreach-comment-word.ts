// xl:title AST 语料 statements/stmt-foreach-comment-word.ts：stmt foreach comment word
// xl:round 677
// xl:judge stdout
// xl:end
//  xl:note `for…of` 的定义段与枚举对象之间夹一条写着 `in` 的注释：仍是 ForOfStatement（第 631 轮）
//  xl:expect Foreach,ForeachDefine,ForeachEnumable,ForeachBody,AreaAnnotation
for (const a /* in */ of [1]) {
  console.log(a);
}
for (const b /* of */ in { k: 1 }) {
  console.log(b);
}
