/* eslint-env mocha */
'use strict'

const R = require('ramda')
const expect = require('chai').expect
const parallel = require('run-parallel')
const TestNode = require('libp2p-pstn-node')
const PS = require('./../node_modules/libp2p-floodsub/src/index')

const Logger = require('./../src/index')
const keys = require('./fixtures/keys').keys
const { MAIN_LOGGER_EVENT_TYPE, PS_LOGGER_EVENT_BASE } = require('./../src/config')

const maxPublishes = 10
const mapIndexed = R.addIndex(R.map)

describe('Multiple Loggers', () => {
  let loggerA
  let loggerB
  let loggerC

  let loggers = R.range(0, 3)

  const topicA = 'Topic A'
  const topicB = 'Topic B'
  const topicC = 'Topic C'

  const shouldNotHappen = () => expect.fail()
  const noop = () => {}

  before(() => {

    const dialP = (loggerA, loggerB) => {
      // console.log(loggerA.peerInfo.id.toB58String(), '=>', loggerB.peerInfo.id.toB58String())
      // console.log('=======================================================================================================')
      return new Promise((resolve) => {
        loggerA.libp2p.dialByPeerInfo(loggerB.peerInfo, (err) => {
          expect(err).to.not.exist
          resolve()
        })
      })
    }

    const startFns = mapIndexed((n, idx) => {
      let node = new TestNode({ id: keys[idx], portOffset: idx })
      loggers[idx] = new Logger(node, PS)
      return node.start()
    }, loggers)

    loggerA = loggers[0]
    loggerB = loggers[1]
    loggerC = loggers[2]

    // Create a little ring topology
    return Promise.all(startFns)
      .then(dialP(loggerA, loggerB))
      .then(dialP(loggerB, loggerC))
      .then(dialP(loggerC, loggerA))
  })

  after(() => {
    const stopFns = R.map((logger) => {
      return logger.libp2p.stop()
    }, loggers)
    return Promise.all(stopFns)
  })

  it(`LoggerA subscribe event for topic '${topicA}' only captured by LoggerA`, (done) => {
    let counterA = 0
    let counterB = 0
    let counterC = 0

    const validateEventA = (data) => {
      const type = data.type
      const id = data.id
      const topic = data.args[0]
      const timestamp = data.timestamp

      expect(id).to.equal(loggerA.peerInfo.id.toB58String())
      expect(type).to.equal(`${PS_LOGGER_EVENT_BASE}subscribe`)
      expect(topic).to.equal(topicA)
      expect(timestamp).to.exist

      counterA++
    }

    const validateEventB = () => counterB++
    const validateEventC = () => counterC++

    loggerA.on(MAIN_LOGGER_EVENT_TYPE, validateEventA)
    loggerB.on(MAIN_LOGGER_EVENT_TYPE, validateEventB)
    loggerC.on(MAIN_LOGGER_EVENT_TYPE, validateEventC)

    loggerA.pubsub.subscribe(topicA)

    setTimeout(() => {
      expect(counterA).to.equal(1)
      expect(counterB).to.equal(0)
      expect(counterC).to.equal(0)

      loggerA.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEventA)
      loggerB.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEventB)
      loggerC.removeListener(MAIN_LOGGER_EVENT_TYPE, validateEventC)

      done()
    }, 300)
  })
})
