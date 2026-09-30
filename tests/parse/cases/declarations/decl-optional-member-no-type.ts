// xl:note 可选但没有类型标注的成员：`private x?;` / `a?;` / `readonly a?;`
//（这里的 `?` 后面直接是 `;`，不会被合并成 `?:` 符号，于是落不进 Field 的延续符号集合——
//  整条成员会散成 `<Statement><Keyword>private</Keyword><Common>x</Common><Symbol>?</Symbol></Statement>`。
//  typescript.d.ts 里 `private compilerHost?;` 一族就是它，共 6 处字段差额）
// xl:expect Field:6,Class,Interface
class C {
  private compilerHost?;
  private pendingOpenFileProjectUpdates?;
  public a?;
  readonly b?;
}
interface I {
  a?;
  readonly b?;
}
