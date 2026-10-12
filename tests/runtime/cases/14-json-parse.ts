// 语料 14：`JSON.parse`（第 122 轮）——与 `node` 逐字节对拍。
//
// 两条刻意避开的东西（都写在明处，不是漏测）：
//   · **非整数的数字不打印**：`JSON.parse("1.5")` 算得动，但 `Float64` 今天没有文本形态
//     （`TextUnitsOf` 对它抛）——那是「浮点文本形态」那块账，不是 `parse` 少做了哪一步；
//   · **坏输入只打印「接住了没有」**：两边的措辞本来就不一样（我们的话是这一层自己写的）。

const text = '{"name":"box","size":3,"ok":true,"tags":["a","b"],"nested":{"deep":[1,2,3]},"none":null}';
const value = JSON.parse(text);
console.log("fields", value.name, value.size, value.ok, value.none);
console.log("array", value.tags.join("-"), value.tags.length);
console.log("nested", value.nested.deep.join(","), value.nested.deep.length);
console.log("roundtrip", JSON.stringify(JSON.parse('[1,2,3]')));
console.log("scalars", JSON.parse("1"), JSON.parse("-2"), JSON.parse("true"), JSON.parse("null"), JSON.parse('"s"'));
console.log("empty", Object.keys(JSON.parse("{}")).length, JSON.parse("[]").length);
console.log("space", JSON.parse('  \t\n {"a" : 1 }  ').a);
console.log("escapes", JSON.parse('"a\\nb\\t\\"c\\""').length, JSON.parse('"\\u0041"'), JSON.parse('"\\u4e2d"'));
console.log("duplicate-key", JSON.parse('{"a":1,"a":2}').a);
console.log("mixed", JSON.parse('{"list":[{"id":1},{"id":2}]}').list.map((item) => item.id).join("+"));

function bad(input: string): string {
  try {
    JSON.parse(input);
    return "parsed";
  } catch (error) {
    return "threw";
  }
}
console.log("bad", bad("{"), bad("[1,]"), bad("01"), bad("1 2"), bad('"unterminated'), bad("{}extra"), bad("nul"));
console.log("after-bad", 1 + 1);
