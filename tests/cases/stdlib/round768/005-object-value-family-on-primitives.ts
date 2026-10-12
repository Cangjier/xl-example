// xl:title 字符串下标族：`slice` / `substring` / `at` / `charCodeAt` / 判位族的边界
// xl:round 768
// xl:judge stdout
// xl:note 三条支的**负数与越界**口径一次钉住：
// xl:note `slice` 收负数（从尾巴数）、`substring` **不收**（负数折成 0）、`substr` 那一档不收；
// xl:note 起点大于终点时 `slice` 给空串、`substring` **会把两者换过来**。
// xl:note `at` 收负数、越界给 `undefined`；`charAt` / 下标越界给空串 / `undefined`（**两回事**）；
// xl:note `charCodeAt` 越界给 `NaN`、`codePointAt` 越界给 `undefined`。
// xl:note 判位族（`indexOf` / `lastIndexOf` / `includes` / `startsWith` / `endsWith`）与
// xl:note `padStart` / `trim` 的两档一起钉。
// xl:end
const s = "abcdef";
console.log("01", s.slice(1, 3), s.slice(-2), s.slice(2, -1), s.slice(4, 2));
console.log("02", s.substring(1, 3), s.substring(3, 1), s.substring(-2, 3));
console.log("03", s.at(0), s.at(-1), s.at(99), s.charAt(99), s[99]);
console.log("04", s.charCodeAt(0), s.charCodeAt(99), s.codePointAt(0), s.codePointAt(99));
console.log("05", s.indexOf("c"), s.indexOf("c", 3), s.lastIndexOf("c"), s.indexOf(""), s.indexOf("z"));
console.log("06", s.includes("cd"), s.startsWith("ab"), s.endsWith("ef"), s.startsWith("bc", 1));
console.log("07", s.padStart(3, "0"), s.padEnd(9, "xy").length, "  x  ".trim().length);
