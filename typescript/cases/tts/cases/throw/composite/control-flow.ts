function classify(value: number): string {
  let label = "";
  switch (value) {
    case 0:
      label = "zero";
      break;
    case 1:
    case 2:
      label = "small";
      break;
    default:
      label = value < 0 ? "negative" : "large";
  }
  return label;
}

outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i === j) continue outer;
    if (i + j > 3) break outer;
  }
}

let count = 0;
do {
  count++;
} while (count < 3);
while (count > 0) count--;

try {
  throw new Error("boom");
} catch (error) {
  console.log("caught", (error as Error).message);
} finally {
  console.log("done");
}

console.log(classify(-1), count);
