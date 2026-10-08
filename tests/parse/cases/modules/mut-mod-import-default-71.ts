// xl:note default import binding
// xl:expect Import
// xl:known-gap 注释夹在 `import a from "m"` 与 `;` 之间：那一段没被收进 `Import`（r660 探针池 mut-mod-import-default-71）
import a from "m"/* c */;
