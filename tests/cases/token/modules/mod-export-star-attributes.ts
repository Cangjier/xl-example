// xl:note `export * from "m" with { … }`：体里**唯一**的那对花括号是属性括号，
// 具名导出那一支必须跳过它（否则会凭空造出一个 `NamedExports`）
// xl:expect Export,Keyword,SymbolToken,Bracket
export * from 'm' with { type: 'json' }
