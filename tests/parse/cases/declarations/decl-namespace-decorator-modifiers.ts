// xl:expect Namespace,NamespaceBody,Decorator,Keyword
// xl:note 同上，`Namespace` 也自己收下声明头：`@dec export declare namespace N { … }` 的
//        `ModuleDeclaration` 从 `@` 起。早先只往回收**一个**修饰词，第二个与装饰器都靠投影层
//        那条「前缀词并进声明」的近似补回来——装饰器一出现那条近似就认不出声明了。
declare function dec(target: any): any;

@dec
export declare namespace N {
  const a = 1;
}

@dec
module M {
  const b = 2;
}

@dec
namespace O.P {
  const c = 3;
}
