// xl:expect Class,Decorator,Field,Function
// xl:note 装饰器名可以是上下文关键字（`@readonly`）：它在关键字表里，但 `@` 后面那一格是「名字当表达式」，
//        不认名字会切成两个 Field，认了名字又升成 Keyword 会让 expression 投成 ReadonlyKeyword
declare function readonly(target: any, key?: string): any;
@readonly
class D {}
class C {
  @readonly
  readonly x = 1;
}
