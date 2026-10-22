// xl:note 行续接认 ECMAScript 的 LineTerminator：`\` + U+2028 / U+2029 也是续接，
// cooked 是去掉续接后的文本（下面四条分别是 "abcd" / "pq" / "xy" / "efg"）。
// xl:expect Statement,Let,String,ConstString
const a = "ab\ cd";
const b = 'p\ q';
const c = `x\ y`;
const d = "e\ f\ g";
