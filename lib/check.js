var EXPIRE = 86400000;

var debug = require("local-debug")('check');
var memoize = require("memoize-async");
var pullSets = require("./pull").sets;
var io = require("./io");
var updateMemo = memoize(update);

module.exports = check;

function check () {
  updateMemo(Math.floor(Date.now() / EXPIRE));
}

function update (time) {
  debug('Checking for updates');

  io('index', function (error, index) {
    if (error) return debug('Failed to read index.');

    pullSets(1, function (error, recent) {
      if (error) return debug('Failed to fetch up-to-date index.');

      var i = -1;
      var len = recent.length;
      while (++i < len) {
        if (recent[i].source == index[0].source) break;
      }

      debug('Diff: %d', i);

      if (i == 0) return;

      io('index', recent.slice(0, i).concat(index), function (error) {
        if (error) return debug('Failed to update index');
        debug('Added %d new set(s) to the index.', i);
      });

    });
  });
}
