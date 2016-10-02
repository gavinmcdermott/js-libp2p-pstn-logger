/* eslint-env mocha */
'use strict'

const R = require('ramda')
const expect = require('chai').expect
const parallel = require('run-parallel')
const TestNode = require('libp2p-pstn-node')
const PS = require('./../node_modules/libp2p-floodsub/src/index')

const Logger = require('./../src/index')
const keys = require('./fixtures/keys').keys
const { MAIN_LOGGER_EVENT_TYPE } = require('./../src/config')

const maxPublishes = 10
const mapIndexed = R.addIndex(R.map)

describe('Multiple Loggers', () => {
  let loggerA
  let loggerB

  let loggerAid
  let loggerBid

  let loggers = R.range(0, 2)

  const topicA = 'Topic A'
  const topicB = 'Topic B'

  const shouldNotHappen = () => expect.fail()
  const noop = () => {}

  const dialP = (loggerA, loggerB) => {
    return new Promise((resolve) => {
      loggerA.libp2p.dialByPeerInfo(loggerB.peerInfo, (err) => {
        expect(err).to.not.exist
        resolve()
      })
    })
  }

  before((done) => {
    const startFns = mapIndexed((n, idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      loggers[idx] = new Logger(node, PS)
      return node.start()
    }, loggers)

    loggerA = loggers[0]
    loggerAid = loggerA.peerInfo.id.toB58String()

    loggerB = loggers[1]
    loggerBid = loggerB.peerInfo.id.toB58String()

    Promise.all(startFns)
      .then(() => {
        setTimeout(done, 1000)
      })
  })

  describe('2 Loggers', () => {

    before((done) => {
      // use a timeout so you don't skip ahead before swarm does its dials
      dialP(loggerA, loggerB)
      .then(() => {
        setTimeout(done, 2000)
      })
    })

    after(() => {
      const stopFns = R.map((logger) => {
        return logger.libp2p.stop()
      }, loggers)
      return Promise.all(stopFns)
    })

    describe(`Single topic (${topicA})`, () => {
      it(`A captures its 'subscribe' event (no other nodes receive notifications)`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateEventA = (data) => {
          const type = data.type
          const id = data.loggerId
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerAid)
          expect(type).to.equal(`subscribe`)
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counterA++
        }

        const validateEventB = () => counterB++

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEventA)
        loggerB.on(MAIN_LOGGER_EVENT_TYPE, validateEventB)

        loggerA.pubsub.subscribe(topicA)

        setTimeout(() => {
          // ensure the logger works
          expect(counterA).to.equal(1)
          expect(counterB).to.equal(0)

          // ensure the call was proxied correctly
          const peersB = loggerB.pubsub.getPeerSet()
          const peerAinB = peersB[loggerAid]
          expect(R.values(peersB).length).to.equal(1)
          expect(peerAinB.topics).to.eql([topicA])

          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEventA)
          loggerB.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEventB)

          done()
        }, 500)
      })

      it(`A captures relevant 'receive' events from all nodes (self included)`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateReceiptInA = (data) => {
          const type = data.type

          if (type !== 'receive') return

          const id = data.loggerId
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(id).to.equal(loggerAid)
          expect(type).to.equal('receive')
          expect(topic).to.equal(topicA)
          expect(timestamp).to.exist

          counterA++
        }

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateReceiptInA)

        // A is subscribed to this topic
        loggerB.pubsub.publish(topicA, 'something from B')
        loggerB.pubsub.publish(topicA, 'something else from B')

        loggerA.pubsub.publish(topicA, 'something from A')
        loggerA.pubsub.publish(topicA, 'something else from A')

        // Nobody is subscribed to this topic
        loggerB.pubsub.publish(topicB, 'something else from B')
        loggerA.pubsub.publish(topicB, 'something else from A')

        setTimeout(() => {
          expect(counterA).to.equal(4)
          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateReceiptInA)
          done()
        }, 500)
      })

      it(`A and B capture their own 'publish' events (no other nodes receive notifications)`, (done) => {
        let counterA = 0
        let counterB = 0

        const validatePublishInA = (data) => {
          const type = data.type

          if (type !== 'publish') return

          const id = data.loggerId
          const timestamp = data.timestamp

          expect(id).to.equal(loggerAid)
          expect(type).to.equal('publish')
          expect(timestamp).to.exist

          counterA++
        }

        const validatePublishInB = (data) => {
          const type = data.type

          if (type !== 'publish') return

          const id = data.loggerId
          const timestamp = data.timestamp

          expect(id).to.equal(loggerBid)
          expect(type).to.equal('publish')
          expect(timestamp).to.exist

          counterB++
        }

        loggerA.on(MAIN_LOGGER_EVENT_TYPE, validatePublishInA)
        loggerB.on(MAIN_LOGGER_EVENT_TYPE, validatePublishInB)

        loggerB.pubsub.publish(topicA, 'to topic A')
        loggerB.pubsub.publish(topicB, 'to topic B')
        loggerB.pubsub.publish(topicB, 'to topic B')

        loggerA.pubsub.publish(topicA, 'to topic A')
        loggerA.pubsub.publish(topicA, 'to topic A')
        loggerA.pubsub.publish(topicB, 'to topic B')

        setTimeout(() => {
          expect(counterA).to.equal(3)
          expect(counterB).to.equal(3)

          loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validatePublishInA)
          loggerB.removeListener(MAIN_LOGGER_EVENT_TYPE, validatePublishInB)

          done()
        }, 500)
      })
    })

    describe(`Multiple topics (${topicA}, ${topicB})`, () => {
      it('Fill_me_in_!!', () => {
        // TODO: add multiple topic tests
      })
    })
  })
})
