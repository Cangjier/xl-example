// xl:title 字符串的 Unicode 面：大小写映射、正规化与码点 / 码元之分
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮第二普查面：`String` 的 Unicode 那半边。判据全用**码点**写出来
// （不打印非 ASCII 字符本身，免得判据文本受终端与编辑器影响）：
// 重点是「长度按码元算、迭代按码点算」这条分界，以及 `normalize` 四种形式。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const run = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
const cps = (s: string): string => Array.from(s).map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase()).join(" ");
const len = (s: string): string => String(s.length);
console.log('01 length 按码元、迭代按码点', run(() => {
  const s = "\u{1F600}a";
  return [len(s), Array.from(s).length, [...s].length].join("|");
}));
console.log('02 charAt / 下标给半个代理对', run(() => {
  const s = "\u{1F600}";
  return [cps(s.charAt(0)), cps(s[0]), s.codePointAt(0)!.toString(16)].join("|");
}));
console.log('03 codePointAt 与 fromCodePoint', run(() => {
  return [String.fromCodePoint(0x1F600) === "\u{1F600}", "\u{1F600}".codePointAt(0) === 0x1F600].join("|");
}));
console.log('04 at 支持负下标', run(() => {
  const s = "abc";
  return [s.at(-1), s.at(0), s.at(9), typeof s.at(-1)].join("|");
}));
console.log('05 大小写映射的三档', run(() => {
  return [cps("\u00E9".toUpperCase()), cps("i".toUpperCase()), cps("\u00DF".toUpperCase()), "i".toUpperCase().length].join("|");
}));
console.log('06 toLocaleUpperCase 与 toUpperCase 在无 locale 时一致', run(() => {
  const s = "abc\u00E9";
  return String(s.toLocaleUpperCase() === s.toUpperCase());
}));
console.log('07 normalize NFC / NFD / NFKC / NFKD', run(() => {
  const composed = "\u00E9";
  const decomposed = "e\u0301";
  return [
    composed.normalize("NFC") === composed,
    composed.normalize("NFD") === decomposed,
    composed.normalize("NFD").length,
    composed.length,
  ].join("|");
}));
console.log('08 NFKC 会折叠兼容字符', run(() => {
  const ligature = "\uFB01";
  return [ligature.normalize("NFKC") === "fi", ligature.length].join("|");
}));
console.log('09 localeCompare 的基本三档', run(() => {
  return [String("a".localeCompare("b") < 0), String("b".localeCompare("a") > 0), String("a".localeCompare("a") === 0)].join("|");
}));
console.log('10 比较用的是码元序', run(() => {
  return [String("Z" < "a"), String("\u00E9" > "z"), String("a" < "ab")].join("|");
}));
console.log('11 trim 那一族认识的空白', run(() => {
  const s = "\t\n\r \u00A0\uFEFFabc\u2028\u2029 ";
  return [s.trim().length, s.trimStart().length, s.trimEnd().length].join("|");
}));
console.log('12 padStart 按码元补、不按码点', run(() => {
  return ["5".padStart(3, "0") + "|" + "5".padStart(3).length + "|" + "abc".padStart(2, "x")].join("");
}));
console.log('13 repeat 的边界', run(() => {
  return ["ab".repeat(3) + "|" + "ab".repeat(0) + "|" + String("ab".repeat(2.9))].join("");
}));
console.log('14 repeat 负数该抛', run(() => "ab".repeat(-1)));
console.log('15 split 的空分隔符与限制', run(() => {
  return [JSON.stringify("abc".split("")), JSON.stringify("a,b,c".split(",", 2)), JSON.stringify("".split(""))].join("|");
}));
console.log('16 字符串是原始值：比较与相等', run(() => {
  const a = "x";
  const b = "x";
  return [a === b, typeof a, new String("x") === "x", new String("x") == "x"].join("|");
}));
console.log('17 fromCharCode 与码元', run(() => {
  return [String.fromCharCode(0x1F600).length, String.fromCharCode(97, 98)].join("|");
}));
console.log('18 点号分隔的切分', run(() => JSON.stringify("a.b.c".split("."))));
