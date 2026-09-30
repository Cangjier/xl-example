const a = 1;
// xl:bom
// xl:note 文件以 UTF-8 BOM 开头：库路径（TextDocument）不剥 BOM，第一个 token 会被污染成 "\uFEFFconst"
// xl:expect Let
// 期望：完整解析 TypeScript 时 BOM 应被当作文档标记忽略，`const a = 1;` 照常解析成 <Let>。
// 现状：只有 cjcli 的 CjcliStripBom 剥 BOM，直接用库 API 时第一行被并成一个 Common。
