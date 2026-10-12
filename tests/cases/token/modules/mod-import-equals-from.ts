// xl:note import-equals（第 67 轮）：`import fs = require("fs")` 的 `From` 必须取到路径
// （那个 `String` 装在已经成形的 `Method` 里，只看直接子单元会漏），
// 而 `defaultImport` 必须为空——等号左边是本地别名，不是默认导入。
// xl:expect Import:3,Method
import fs = require("fs");
import type x = require("m");
import y = A.B.C;
