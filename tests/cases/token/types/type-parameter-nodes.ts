// xl:note 形参一律收成 Parameter：函数 / 方法 / 函数类型 / 调用签名 / 构造签名五处（第 66 轮第六批）
// xl:expect Parameter:7,Function,MethodDeclaration,FunctionType,Signature:2
function f(a: A, b?: B) {}
class C { m(x: X) {} }
type F = (p: P, q: Q) => R;
interface I { (s: S): T }
interface J { new (t: T): U }
