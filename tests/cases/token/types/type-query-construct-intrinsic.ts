// xl:expect TypeQuery,Signature,TypeAssign,GenericType,Method,Keyword,TypeDefine,ReturnType
// xl:note 类型查询的实参段（typeof f<string>）、构造类型、构造签名、intrinsic 关键字、实例化调用
function make<T>(): T { throw new Error("x") }
type Instantiated = typeof make<string>;
type Ctor = new <T>(x: T) => T;
interface CtorSig { new (): Date }
type Intrinsic = intrinsic;
const v = make<number>();
