'use strict'

const debug = require('debug')

const PUBLISH_EVENT = 'publish'
const RECEIVE_EVENT = 'receive'
const SUBSCRIBE_EVENT = 'subscribe'
const UNSUBSCRIBE_EVENT = 'subscribe'

const log = debug('pstn:logger')
log.err = debug('pstn:logger:error')

module.exports = {
  log,
  PUBLISH_EVENT,
  RECEIVE_EVENT,
  SUBSCRIBE_EVENT,
  UNSUBSCRIBE_EVENT
}
