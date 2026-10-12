// xl:title 缺口：正则字面量在降级层直接断（整份文件进不来）
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量在降级层直接断（unimplemented: expression RegularExpressionLiteral）：RegExp 是非目标，但 `node` 跑得动这一条 ⇒ 按仓库口径记缺口，不记 skip
// xl:end

const re = /a(b)/;
console.log(re.test("ab"), "ab".replace(re, "$1"));
