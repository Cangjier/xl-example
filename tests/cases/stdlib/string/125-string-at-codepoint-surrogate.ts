// xl:title at / codePointAt / fromCodePoint 对代理对的处理
// xl:round 7
// xl:judge stdout
// xl:end

const emoji = "a\u{1F600}b";
console.log(emoji.length, [...emoji].length);
console.log(emoji.at(0), emoji.at(1), emoji.at(-1));
console.log(emoji.codePointAt(1) === 0x1f600, emoji.codePointAt(2));
console.log(String.fromCodePoint(0x1f600) === [...emoji][1]);
console.log([..."\u{1F600}"].map((c) => c.length).join(","));
