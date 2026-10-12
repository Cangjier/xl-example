// xl:note 成员开头的类型参数：类型字面量 / 接口体里的泛型调用签名（第 66 轮第十三批补，
// 判据是「宿主还是空的」也算类型参数段；对照 `a < b > c` 必须仍是裸符号）
// xl:expect Signature:3,GenericType:5,TypeParameter:5,Let:4,Interface,TypeAssign,FunctionType,Lamda
const h: { <T>(x: T): T } = null as any;
interface Y { <T>(): T }
const k: { new <T>(x: T): T } = null as any;
const c = a < b > c;
type Z = <T>(x: T) => T;
const m = <T,>(x: T) => x;
