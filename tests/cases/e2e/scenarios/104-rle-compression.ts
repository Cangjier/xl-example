// xl:title 游程编码压缩与解压
// xl:round 371
// xl:judge stdout
// xl:end
function encode(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input.charAt(i);
    let run = 1;
    while (i + run < input.length && input.charAt(i + run) === ch) run += 1;
    out += run > 1 ? String(run) + ch : ch;
    i += run;
  }
  return out;
}
function decode(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    let digits = "";
    while (i < input.length && input.charAt(i) >= "0" && input.charAt(i) <= "9") { digits += input.charAt(i); i += 1; }
    const ch = input.charAt(i);
    i += 1;
    out += ch.repeat(digits === "" ? 1 : Number(digits));
  }
  return out;
}
const samples = ["aaabbbcccd", "abcd", "aaaaaaaaaaaa", "a", ""];
for (const s of samples) {
  const packed = encode(s);
  console.log(JSON.stringify(s), "->", JSON.stringify(packed), "->", JSON.stringify(decode(packed)), decode(packed) === s);
}
const long = "ab".repeat(500) + "c";
console.log(encode(long).length, decode(encode(long)).length, decode(encode(long)) === long);
