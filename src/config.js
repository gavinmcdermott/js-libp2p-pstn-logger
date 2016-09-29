'use strict'

const debug = require('debug')

const log = debug('pstn:logger')
log.err = debug('pstn:logger:error')

module.exports = { log }
