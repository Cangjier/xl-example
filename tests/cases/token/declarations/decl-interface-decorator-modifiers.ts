// xl:expect Interface,InterfaceBody,Decorator
// xl:note 声明头归声明自己：`@dec export declare interface I {}` 的 `InterfaceDeclaration`
//        从 `@` 起，`Decorator` / `ExportKeyword` / `DeclareKeyword` 都在 `modifiers` 一列里
//        （TS 口径）。早先这里只往回吃一个 `export` 词，装饰器留在外面成了平级兄弟——
//        尺度上报「缺 `InterfaceDeclaration` 1 + 多出 1」，`@dec` × 四种修饰词组合全中。
declare function dec(target: any): any;

@dec
export declare interface I {
  a: number;
}

@dec
interface J {
  b: string;
}

@dec
export interface K {
  c: boolean;
}
