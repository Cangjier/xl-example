// xl:note 具名导入子句的 `{`：`import` 与 `{` 之间夹着带花括号的注释时，位置由 token 出的 `NamedBraceAt` 定位
// xl:expect Import
import /* { */ { A, B } from "m"
import /* } */ { C as D } from "n"
