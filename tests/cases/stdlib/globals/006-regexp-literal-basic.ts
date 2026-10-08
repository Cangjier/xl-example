// xl:title 正则字面量与 exec / test
// xl:judge stdout
// xl:want blocked
// xl:why 正则字面量还没进降级层：`unimplemented: expression RegularExpressionLiteral`。**RegExp 必做**（用户口径）
// xl:end

const re = /a(b+)c/;
const m = re.exec("xabbc");
console.log(m ? m[0] + "|" + m[1] : "none", /z/.test("abc"));
