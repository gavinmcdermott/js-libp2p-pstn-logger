'use strict'

const debug = require('debug')

const MAIN_LOGGER_EVENT_TYPE = 'data'
const PS_LOGGER_EVENT_BASE = 'logger:pubsub:'

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
  MAIN_LOGGER_EVENT_TYPE,
  PS_LOGGER_EVENT_BASE
}
