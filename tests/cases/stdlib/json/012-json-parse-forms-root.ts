// xl:title JSON.parse 的空白 / 转义 / 数字 / 嵌套 / 错误
// xl:judge stdout
// xl:end

const v: any = JSON.parse('  { "a" : [1, 2.5, -3e2], "b" : "x\\ny", "c" : null }  ');
console.log(v.a.join(","), v.b.length, v.b[1], v.c, v.a[2]);
try { JSON.parse("{oops}"); } catch (e: any) { console.log(e.name); }
try { JSON.parse(""); } catch (e: any) { console.log(e.name); }
