// xl:title do..while 里的 break 与 continue
// xl:judge stdout
// xl:end

let i = 0;
const out: number[] = [];
do {
  i++;
  if (i === 2) continue;
  if (i === 4) break;
  out.push(i);
} while (i < 10);
console.log(out.join(","), i);
