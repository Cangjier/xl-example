// xl:expect TypeAssign,Decorator,Keyword
// xl:note 类型别名也自己收头：`@dec export type T = number` 的 `TypeAliasDeclaration` 从 `@` 起
//        （TS 口径）。早先这里没走 `DeclarationStart`，散着的装饰器让整条退化成
//        `ExpressionStatement`——缺 `TypeAliasDeclaration` / `Identifier` / `NumberKeyword`。
declare function dec(target: any): any;

@dec
export type T = number;

@dec
declare type U = string;
