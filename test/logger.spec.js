'use strict'

const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src/index')
const TestNode = require('libp2p-pstn-node')
const R = require('ramda')

const keys = require('./fixtures/keys').keys
const Logger = require('./../src/index')
const { LOGGER_EVENT_BASE } = require('./../src/config')

const mapIndexed = R.addIndex(R.map)

const noop = () => {}

describe('Logger', () => {
  let loggerA
  let loggerB

  let loggers = R.range(0, 1)

  const topicA = 'AAA'
  const topicB = 'BBB'

  const validNode = new TestNode({ id: keys[0], portOffset: 0 })

  before(() => {
    const startFns = mapIndexed((n, idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      // node.libp2p.swarm.on('peer-mux-established', () => console.log('WORD'))
      loggers[idx] = new Logger(node, PS)
      return node.start
    }, loggers)

    loggerA = loggers[0]

    return Promise.all(startFns)
  })

  after(() => {
    const stopFns = R.map((logger) => {
      return logger.node.libp2p.stop
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
      expect(logger.node instanceof TestNode).to.be.true
      expect(logger.pubsub instanceof PS).to.be.true
    })
  })

  describe('Logger.pubsub event capture', () => {
    // this function is defined and reassigned in each test block
    let validateEvent = noop

    describe('subscribe', () => {
      after(() => {
        loggerA.removeListener(LOGGER_EVENT_BASE, validateEvent)
      })

      it('success', () => {
        let counter = 0

        validateEvent = (data) => {
          const loggerId = data.loggerId
          const event = data.event
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(R.equals(loggerId, loggerA.id)).to.be.true
          expect(R.equals(event, 'subscribe')).to.be.true
          expect(R.equals(topic, topicA)).to.be.true
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(LOGGER_EVENT_BASE, validateEvent)

        expect(counter).to.equal(0)

        loggerA.pubsub.subscribe(topicA)

        expect(counter).to.equal(1)
      })
    })

    describe('publish', () => {
      after(() => {
        loggerA.removeListener(LOGGER_EVENT_BASE, validateEvent)
      })

      it('success', () => {
        let counter = 0

        validateEvent = (data) => {
          const loggerId = data.loggerId
          const event = data.event
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(R.equals(loggerId, loggerA.id)).to.be.true
          expect(R.equals(event, 'publish')).to.be.true
          expect(R.equals(topic, topicA)).to.be.true
          expect(timestamp).to.exist

          counter++
        }

        loggerA.on(LOGGER_EVENT_BASE, validateEvent)

        expect(counter).to.equal(0)

        loggerA.pubsub.publish(topicA, new Buffer('Hey there!'))

        expect(counter).to.equal(1)
      })
    })

    describe('unsubscribe', () => {
      after(() => {
        loggerA.removeListener(LOGGER_EVENT_BASE, validateEvent)
      })

      it('success', () => {
        let counter = 0

        validateEvent = (data) => {
          const loggerId = data.loggerId
          const event = data.event
          const topic = data.args[0]
          const timestamp = data.timestamp


          expect(loggerId).to.equal(loggerA.id)
          expect(event).to.equal('unsubscribe')
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counter++
        }

        expect(counter).to.equal(0)

        loggerA.pubsub.subscribe(topicA)
        loggerA.on(LOGGER_EVENT_BASE, validateEvent)
        loggerA.pubsub.unsubscribe(topicA)

        expect(counter).to.equal(1)
      })
    })
  })
})
