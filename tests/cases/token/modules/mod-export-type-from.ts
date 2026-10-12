// xl:note type-only re-export
// xl:expect Export,Bracket
// xl:absent TypeLiteral
// xl:note `import type { … }` / `export type { … }` 后面那个花括号是**导入/导出列表**，不是类型字面量：TypeScript 的 AST 里它是 ImportClause/ExportClause 下的具名绑定（一个 PropertySignature 都没有）。原来它被收成 `TypeLiteral`（里面每个名字还成了一个 `Field`），期望是照着那个产物写的；现在按真正该有的结构断言
export type { A } from "m";
