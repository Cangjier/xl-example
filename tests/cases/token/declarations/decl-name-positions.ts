// xl:expect TypeAssign,Let,Interface,Enum,Class,Field,MethodDeclaration
// xl:note 声明名的位置由 token 直出：名字首字母与关键字 / 修饰词同形时（`type t` / `interface i` / `enum e`），回原文 indexOf 会先命中前面那个同形字母
type t = number;
interface i {}
enum e { A }
const c = 1;
class k {
  m = 1;
  f(): void {}
}
