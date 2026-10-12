// xl:title if / else if / else 与嵌套
// xl:judge stdout
// xl:end

function grade(n: number): string {
  if (n >= 90) return "A";
  else if (n >= 80) return "B";
  else if (n >= 60) { if (n >= 70) return "C"; return "D"; }
  else return "F";
}
console.log(grade(95), grade(85), grade(75), grade(65), grade(10));
