'use strict'

const debug = require('debug')

const logger = debug('pstn:logger')
logger.err = debug('pstn:logger:error')

const pubsubLogger = debug('pstn:pubsubLogger')
pubsubLogger.err = debug('pstn:pubsubLogger:error')

const nodeLogger = debug('pstn:nodeLogger')
nodeLogger.err = debug('pstn:nodeLogger:error')

module.exports = {
  logger,
  nodeLogger,
  pubsubLogger,
}
