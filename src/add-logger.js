'use strict'

const R = require('ramda')
const EE = require('events').EventEmitter
const TestNode = require('libp2p-pstn-node')

const { log, PUBLISH_EVENT, RECEIVE_EVENT } = require('./config')
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
  // - we also leave out calls to subscribe and unsubscribe currently
  const pubsubProxyFns = ['publish', 'emit']

  const proxyMap = R.map((fnName) => {
    const fn = fnName
    let type
    switch (fnName) {
      case 'publish':
        type = PUBLISH_EVENT
        break
      case 'emit':
        type = RECEIVE_EVENT
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

      let msg = args[1]
      let topic = args[0]

      if (R.isNil(msg)) {
        log(type, id, topic)
      } else {
        if (!(msg instanceof Buffer)) {
          msg = new Buffer(msg)
        }
        log(type, id, topic, msg)
      }

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
