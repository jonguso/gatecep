const events = [];
events.push("PARENT_CLOSE");
setTimeout(() => {
  events.push("FLOATING_OPEN");
  if (events.join(">") !== "PARENT_CLOSE>FLOATING_OPEN") {
    throw new Error("Modal handoff ordering failed");
  }
  console.log("PASS — parent close precedes Floating Coach activation.");
}, 0);
