// xl:note 类型谓词 `value is T` 的三个字段（parameterName / isKeyword / type）：`is` 是 Keyword、谓词里的类型走类型位
// xl:expect TypePredicate:2,Keyword
declare function f(value: unknown): value is T;
declare function g(value: unknown): asserts value is T;
