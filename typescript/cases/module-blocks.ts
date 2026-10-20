// module / namespace 块 chunk 1：base + trivia 变体。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。以 // 开头的行是暂缓目标，不照进用例。
// M1 namespace 基形
namespace N {}
namespace N { let x = 1; }
namespace N { const x = 1; }
namespace N { let x = 1;\nlet y = 2; }
namespace N { ; }
namespace N { { let x = 1; } }
namespace N { if (a) b; }
namespace N { let x = 1; let y = 2; }
// M2 module 关键字（同形，关键字不同）
module N {}
module N { let x = 1; }
// M3 declare module（字符串模块名 + declare 修饰）
declare module "m" {}
declare module "m" { let x = 1; }
// M4 export 修饰
export namespace N {}
export namespace N { const x = 1; }
// M5 trivia
namespace /* c */ N {}
namespace N { // c\nlet x = 1; }
namespace N {\n  let x = 1;\n}
// M6 限定名（嵌套 ModuleDeclaration）
namespace A.B {}
namespace A.B.C {}
namespace A.B { let x = 1; }
declare namespace N {}
// M7 暂缓：module augmentation（chunk 2）、export as namespace、global augmentation、函数声明进 namespace
