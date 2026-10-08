// xl:title switch 落在字符串上：贯穿与 default 在中间
// xl:judge stdout
// xl:end

function classify(s: string): string {
  let out = "";
  switch (s) {
    case "a":
    case "b": out += "ab"; break;
    case "c": out += "c";
    default: out += "+d";
  }
  return out;
}
console.log(classify("a"), classify("b"), classify("c"), classify("z"));
