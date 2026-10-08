// xl:title String.slice / substring（负下标那一档不一样）
// xl:judge stdout
// xl:end

const s = "abcdef";
console.log(s.slice(1, 3), s.slice(-2), s.slice(3), s.slice(9), s.slice(3, 1));
console.log(s.substring(1, 3), s.substring(3, 1), s.substring(-2));
