// xl:expect Class,ClassBody,Interface,InterfaceBody,Function,FunctionBody,TypeAssign,MethodDeclaration,Namespace,NamespaceBody
// xl:note 声明形状矩阵：类 / 接口 / 函数 / 类型别名的字段组合（有体 / 无体、有型参 / 无型参、有继承 / 无继承）
export declare class DeclA extends Base implements Face {
  n: number;
}
export declare class DeclB<T> extends Base<T> implements Face {
  n: T;
}
export declare class DeclC<T> {
  n: T;
}
export interface FaceA extends Face {
  m(): void;
}
export interface FaceB<T> extends Face<T> {
  m(): T;
}
export interface FaceC extends Face {}
export interface FaceD<T> extends Face<T> {}
export interface FaceE<T> {
  m(): T;
  m2?(): void;
  m3<T>(): T;
  m4?(a: number): void;
}
export function fnA<T>(a: T): T { return a }
declare function fnB<T>(a: T): T;
declare function fnC(): void;
declare function fnD<T>(): T;
export type Box<T> = T[];
declare namespace ShapeSpace {
  function nsA(a: number): void;
  function nsB<T>(a: T): T;
  function nsC<T>(): T;
  function nsD(): void;
}
