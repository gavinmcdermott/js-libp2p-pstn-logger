'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')
const parallel = require('run-parallel')

const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')
const { MAIN_LOGGER_EVENT_TYPE, PS_LOGGER_EVENT_BASE } = require('./../src/config')

const mapIndexed = R.addIndex(R.map)

const noop = () => {}

describe('Logger', () => {
  let loggerA
  let loggers = R.range(0, 1)
  const topicA = 'AAA'
  const validNode = new TestNode({ id: keys[0], portOffset: 0 })

  before(() => {
    const startFns = mapIndexed((n, idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      loggers[idx] = new Logger(node, PS)
      return node.start()
    }, loggers)

    loggerA = loggers[0]

    return Promise.all(startFns)
  })

  after(() => {
    const stopFns = R.map((logger) => {
      return logger.libp2p.stop()
    },loggers)

    return Promise.all(stopFns)
  })

  describe('constructor', () => {
    it('fail: missing testnet node', () => {
      const thrower = () => new Logger()
      expect(thrower).to.throw
    })

    it('fail: invalid testnet node', () => {
      const thrower = () => new Logger({})
      expect(thrower).to.throw
    })

    it('fail: missing pubsub strategy', () => {
      const thrower = () => new Logger(validNode)
      expect(thrower).to.throw
    })

    it('success', () => {
      const logger = new Logger(validNode, PS)
      expect(logger instanceof Logger).to.be.true
      expect(logger.pubsub instanceof PS).to.be.true
    })
  })

  describe('Capture Logger.pubsub events from self', () => {
    describe(`${PS_LOGGER_EVENT_BASE}subscribe`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const id = data.id
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerA.peerInfo.id.toB58String())
          expect(type).to.equal('logger:pubsub:subscribe')
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEvent)
        expect(counter).to.equal(0)
        loggerA.pubsub.subscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`${PS_LOGGER_EVENT_BASE}publish`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const id = data.id
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerA.peerInfo.id.toB58String())
          expect(type).to.equal(`${PS_LOGGER_EVENT_BASE}emit`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEvent)
        expect(counter).to.equal(0)
        loggerA.pubsub.publish(topicA, new Buffer('Hey there!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`${PS_LOGGER_EVENT_BASE}emit`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const id = data.id
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerA.peerInfo.id.toB58String())
          expect(type).to.equal(`${PS_LOGGER_EVENT_BASE}emit`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        expect(counter).to.equal(0)

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEvent)
        loggerA.pubsub.publish(topicA, new Buffer('Hi!'))

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEvent)
          done()
        }, 100)
      })
    })

    describe(`${PS_LOGGER_EVENT_BASE}unsubscribe`, () => {
      it('success', (done) => {
        let counter = 0

        const validateEvent = (data) => {
          const type = data.type
          const id = data.id
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerA.peerInfo.id.toB58String())
          expect(type).to.equal(`${PS_LOGGER_EVENT_BASE}unsubscribe`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        expect(counter).to.equal(0)

        loggerA.pubsub.subscribe(topicA)
        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEvent)
        loggerA.pubsub.unsubscribe(topicA)

        setTimeout(() => {
          expect(counter).to.equal(1)
          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEvent)
          done()
        }, 100)
      })
    })
  })
})
