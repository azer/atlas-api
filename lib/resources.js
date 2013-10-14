var io = require("./io");
var check = require("./check");

module.exports = {
  set: set,
  sets: sets,
  '*': sets
};

function set (params, reply) {
  io('/set/'+ params[0], reply);
}

function sets (params, reply) {
  io('index', reply);
  process.nextTick(check);
}
