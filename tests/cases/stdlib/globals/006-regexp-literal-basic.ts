// xl:title 正则字面量与 exec / test
// xl:judge stdout
// xl:end

const re = /a(b+)c/;
const m = re.exec("xabbc");
console.log(m ? m[0] + "|" + m[1] : "none", /z/.test("abc"));
