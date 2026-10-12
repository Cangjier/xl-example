// xl:note break label / continue label
// xl:expect Label,For,ForBody
loop: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (skip()) continue loop
    if (stop()) break loop
  }
}
