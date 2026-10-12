// xl:title 端到端：游程编码与解码（边界、单字符、往返校验）
// xl:round 7
// xl:judge stdout
// xl:end

function encode(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    const n = j - i;
    out += (n > 1 ? String(n) : "") + s[i];
    i = j;
  }
  return out;
}
function decode(s: string): string {
  let out = "";
  let num = "";
  for (const c of s) {
    if (c >= "0" && c <= "9") { num += c; continue; }
    out += c.repeat(num === "" ? 1 : Number(num));
    num = "";
  }
  return out;
}
const samples = ["aaabbbcccd", "abc", "", "a", "aaaaaaaaaaaa", "aabbaa"];
for (const s of samples) {
  const e = encode(s);
  console.log(JSON.stringify(s) + " -> " + JSON.stringify(e) + " -> " + (decode(e) === s));
}
