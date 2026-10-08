// xl:title charAt / charCodeAt / codePointAt 在越界与代理对上
// xl:judge stdout
// xl:end

const s = "A\u{1F600}B";
console.log(s.length, s.charAt(0), s.charAt(99) === "", s.charCodeAt(0));
console.log(s.codePointAt(1), s.codePointAt(2), s.codePointAt(99));
console.log([...s].length, JSON.stringify([...s]));
console.log(String.fromCodePoint(0x1f600).length, String.fromCharCode(65, 66));
