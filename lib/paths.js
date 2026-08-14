const path = require('path');

// Configurable so a host with an ephemeral filesystem (e.g. Railway) can
// point this at a mounted persistent volume via the DATA_DIR env var.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

module.exports = { DATA_DIR };
