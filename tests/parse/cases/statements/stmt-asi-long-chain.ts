// xl:note 仓库无分号风格的一长串语句：每条都要有自己的边界
// xl:expect Let,Statement
let total = 0
for (let i = 0; i < xs.length; i++) {
  total += xs[i]
  if (total > 100) break
}
const last = xs[xs.length - 1]
f(total, last)
log("done");
