// xl:note 类 / 接口 / 枚举 / 命名空间 / 静态块的花括号前夹一条注释——声明头的「恰好用完」判定要跨 trivia
// xl:expect Class,ClassBody,Interface,InterfaceBody,Enum,EnumBody,Namespace,NamespaceBody,StaticBlock
class /* 关键字与名字之间 */ Commented {
  static /* 关键字与括号之间 */ {
    this.ready = true;
  }

  ready = false;
}

interface /* 关键字与名字之间 */ Body {
  size: number;
}

enum /* 关键字与名字之间 */ Level {
  Low,
}

namespace /* 关键字与名字之间 */ Space {
  export const value = 1;
}

export { Commented, Space };
export type { Body, Level };
