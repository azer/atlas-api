var server = require("json-resources");

module.exports = server(require('./resources')).start;
