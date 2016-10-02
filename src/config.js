'use strict'

const debug = require('debug')

const LOGGER_EVENT = 'data'

const log = debug('pstn:logger')
log.err = debug('pstn:logger:error')

module.exports = { log, LOGGER_EVENT }
