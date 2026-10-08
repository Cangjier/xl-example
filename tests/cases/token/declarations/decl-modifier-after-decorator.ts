// xl:expect Class,Decorator,Field,Function
// xl:note 修饰词的位置由 token 直出：装饰器名里带着同一个词时（`@exported export class C {}`、
//        `@readonlyx readonly x = 1`），回原文 indexOf 先命中的是装饰器里那一段
declare function exported(target: any): any;
declare function readonlyx(target: any, key: string): any;
@exported
export class C {
  @readonlyx
  readonly x = 1;
}
