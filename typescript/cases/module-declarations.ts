// module / export 声明 chunk 1：export-assignment / namespace-export 已绿；import-equals 见下方暂缓。
// 一行一个用例；行内 `\n` 由 ast-json.mjs 还原成真实换行。
// 说明见 docs/coverage-module.md。

// ===== base =====
export = x;
export = f;
export as namespace N;

// ===== trivia 叠加：尾注释 =====
export = x; // trailing
export as namespace N; // trailing

// ===== trivia 叠加：行内注释 =====
export /* c */ = x;
export as namespace /* c */ N;

// ===== trivia 叠加：换行 =====
export =\nx;
export as namespace\nN;

// ===== trivia 叠加：前导空白 / 重复形 =====
  export = x;
  export as namespace N;
export = x; export as namespace N;

// ===== 暂缓（依赖 import-declaration 候选时序，非本 chunk 可改）=====
// import x = require("m");   —— ImportEqualsDeclaration + ExternalModuleReference + StringLiteral
// import y = require("other");
// import x = A.B;            —— 另需 ast-json.mjs 的 ["FirstNode","QualifiedName"] 别名
