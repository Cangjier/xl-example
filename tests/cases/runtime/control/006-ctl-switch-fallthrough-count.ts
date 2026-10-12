// xl:title 经典的 switch 计数（不带 break 的累加）
// xl:judge stdout
// xl:end

function days(month: number): number {
  switch (month) {
    case 2: return 28;
    case 4: case 6: case 9: case 11: return 30;
    default: return 31;
  }
}
console.log(days(1), days(2), days(4), days(12));
