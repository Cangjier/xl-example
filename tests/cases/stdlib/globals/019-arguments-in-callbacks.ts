// xl:title 回调里的 `arguments`：重入那条路也要收
// xl:round 332
// xl:judge stdout
// xl:end

[1, 2, 3].forEach(function (x) {
  console.log(x, arguments.length, arguments[0]);
});
const mapped = [1, 2].map(function (x) {
  return arguments.length;
});
console.log(mapped.join(","));
queueMicrotask(function () {
  console.log("micro argc", arguments.length);
});
console.log("sync");
