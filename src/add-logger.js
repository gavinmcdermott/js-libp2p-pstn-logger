'use strict'

const R = require('ramda')
const EE = require('events').EventEmitter

const { log, PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT } = require('./config')
const { LoggerError } = require('./errors')

module.exports = function addLogger (pubsub, id) {
  if (R.isNil(pubsub)) {
    throw new LoggerError('Missing pubsub')
  }

  if (R.isNil(id)) {
    throw new LoggerError('Missing id')
  }

  const logger = new EE()

  // Important Note:
  // - 'emit' is currently pubsub's receive event - the pubsub event emitter is
  // called when a message is received for a topic the pubsub node is interested in
  const pubsubProxyFns = ['publish', 'emit', 'subscribe', 'unsubscribe']

  const proxyMap = R.map((fnName) => {
    const fn = fnName
    let type
    switch (fnName) {
      case PUBLISH_EVENT:
        type = PUBLISH_EVENT
        break
      case 'emit':  // a.k.a. receive
        type = RECEIVE_EVENT
        break
      case SUBSCRIBE_EVENT:
        type = SUBSCRIBE_EVENT
        break
      case UNSUBSCRIBE_EVENT:
        type = UNSUBSCRIBE_EVENT
        break
      default:
        throw new LoggerError(`Unrecognized function to proxy: ${fnName}`)
    }

    return { fn, type }
  }, pubsubProxyFns)

  const decorate = function (fn, type) {
    if (typeof fn !== 'function') throw new LoggerError('expect <fn> to be a function')
    return (...args) => {
      const data = {
        timestamp: Date.now(),
        source: id,
        type,
        args
      }

      const rawTopic = args[0] ? args[0] : ''
      const rawMsg = args[1] ? args[1] : ''

      const topic = new Buffer(rawTopic).toString('base64')
      const msg = new Buffer(rawMsg).toString('base64')

      log(type, id, topic, msg)

      // If using the eventEmitter
      logger.emit(type, data)

      return fn.apply(pubsub, args)
    }
  }

  const decoratePubsub = (proxies) => {
    R.forEach((proxy) => pubsub[proxy.fn] = decorate(pubsub[proxy.fn], proxy.type), proxies)
  }

  decoratePubsub(proxyMap)

  return logger
}
