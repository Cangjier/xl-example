// xl:note `import defer * as ns from "m"`（TS 5.9 延迟导入）：`defer` 是相位修饰词，
// 不是默认导入名——`Import` 的 `namespace` 属性必须指向 `ns`。
// xl:expect Import:2
import defer * as ns from "m";
import defer from "./defer.js";
