// module / export 声明：export-assignment / namespace-export / import-equals。
// 一行一个用例；行内 `\n` 由 ast-json.mjs 还原成真实换行。
// 说明见 docs/coverage-module.md。

// ===== base =====
export = x;
export = f;
export as namespace N;
import x = require("m");
import y = require('other');
import z = A.B;
import w = A.B.C;

// ===== trivia 叠加：尾注释 =====
export = x; // trailing
export as namespace N; // trailing
import x = require("m"); // trailing

// ===== trivia 叠加：行内注释 =====
export /* c */ = x;
export as namespace /* c */ N;
import /* c */ x = require("m");
import x /* c */ = require("m");

// ===== trivia 叠加：换行 =====
export =\nx;
export as namespace\nN;
import x =\nrequire("m");
import x = require(\n"m"\n);

// ===== trivia 叠加：前导空白 / 重复形 =====
  export = x;
  export as namespace N;
  import x = require("m");
export = x; export as namespace N;
import x = require("m"); import y = A.B;

// ===== 无体 ambient module（cover-module-globals-1） =====
declare module "m";
declare module "m"; // c
declare /* c */ module "m2" ;
