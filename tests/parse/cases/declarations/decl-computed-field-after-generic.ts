// xl:note 计算名字段后面紧跟下一个成员：`readonly entries: () => X<string>` 换行
// `readonly [Symbol.iterator]: () => Y`
//（`IsMemberBoundary` 跳裸名字的循环停在计算名的 `[` 上，判不出边界，
//  于是整条成员被上一个字段吞进 TypeDefine。
//  判据是「括号里有没有内容」——数组后缀是空 `[]`，计算名里一定装着东西；
//  不能用 `Context`：`readonly` 会把计算名的括号推到类型位，与数组后缀同值）
// xl:expect Field:4,Interface
interface I {
  readonly keys: () => X<string>
  readonly values: () => X<string>
  readonly entries: () => X<[string, string]>
  readonly [Symbol.iterator]: () => X<[string, string]>
}
