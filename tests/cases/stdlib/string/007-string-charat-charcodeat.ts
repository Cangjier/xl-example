// xl:title String.charAt / charCodeAt（越界那一档）
// xl:judge stdout
// xl:end

const s = "Abc";
console.log(s.charAt(0), s.charAt(9).length, s.charCodeAt(0), s.charCodeAt(1));
console.log("".charCodeAt(0) !== "".charCodeAt(0));
