/* eslint-env mocha */
'use strict'

const R = require('ramda')
const expect = require('chai').expect
const TestNode = require('libp2p-pstn-node')
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src')

const addTestLog = require('./../src')
const keys = require('./fixtures/keys').keys
const { LOGGER_EVENT } = require('./../src/config')

const NUM_NODES = 2

const mapIndexed = R.addIndex(R.map)

describe(`Multiple Pubsub.test's:`, () => {
  let nodeA
  let nodeAid
  let pubsubA

  let nodeB
  let nodeBid
  let pubsubB

  const topicOne = 'Topic One'
  const topicTwo = 'Topic Two'

  let nodes = []
  let pubsubs = []

  let nodeCount = R.range(0, NUM_NODES)

  const shouldNotHappen = () => expect.fail()
  const noop = () => {}

  const dialP = (nodeA, nodeB) => {
    return new Promise((resolve) => {
      nodeA.libp2p.dialByPeerInfo(nodeB.peerInfo, (err) => {
        expect(err).to.not.exist
        resolve()
      })
    })
  }

  before((done) => {
    const startFns = mapIndexed((n, idx) => {
      let testNode = new TestNode({ id: keys[idx], portOffset: idx })
      nodes.push(testNode)

      let pubsub = PS(testNode.libp2p)
      addTestLog(pubsub, testNode.peerInfo.id.toB58String())
      pubsubs.push(pubsub)

      return testNode.start()
    }, nodeCount)

    nodeA = nodes[0]
    pubsubA = pubsubs[0]
    nodeAid = nodeA.peerInfo.id.toB58String()

    nodeB = nodes[1]
    pubsubB = pubsubs[1]
    nodeBid = nodeB.peerInfo.id.toB58String()

    Promise.all(startFns)
      .then(() => {
        setTimeout(done, 1000)
      })
  })

  describe('2 Pubsubs (A, B):', () => {

    before((done) => {
      // use a timeout so you don't skip ahead before swarm does its dials
      dialP(nodeA, nodeB)
      .then(() => {
        setTimeout(done, 2000)
      })
    })

    after(() => {
      const stopFns = R.map((node) => {
        return node.libp2p.stop()
      }, nodes)

      return Promise.all(stopFns)
    })

    describe(`Single topic (${topicOne}):`, () => {
      it(`'subscribe' event only emitted by the subscribing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateEventA = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(`subscribe`)
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        const validateEventB = () => counterB++

        pubsubA.test.on(LOGGER_EVENT, validateEventA)
        pubsubB.test.on(LOGGER_EVENT, validateEventB)

        pubsubA.subscribe(topicOne)

        setTimeout(() => {
          // ensure the logger works
          expect(counterA).to.equal(1)
          expect(counterB).to.equal(0)

          // ensure the call was proxied correctly
          const peersB = pubsubB.getPeerSet()
          const peerAinB = peersB[nodeAid]
          expect(R.values(peersB).length).to.equal(1)
          expect(peerAinB.topics).to.eql([topicOne])

          pubsubA.test.removeListener(LOGGER_EVENT, validateEventA)
          pubsubB.test.removeListener(LOGGER_EVENT, validateEventB)

          done()
        }, 500)
      })

      it(`'receive' events emitted when receiving publications on relevant topics from all nodes (self included)`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateReceiptInA = (data) => {
          const type = data.type

          if (type !== 'receive') return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal('receive')
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        pubsubA.test.on(LOGGER_EVENT, validateReceiptInA)

        // A is subscribed to this topic
        R.forEach(() => {
          pubsubA.publish(topicOne, `${topicOne} from A`)
        }, R.range(0, 2))

        R.forEach(() => {
          pubsubB.publish(topicOne, `${topicOne} from A`)
        }, R.range(0, 2))

        // None subscribed to this topic
        R.forEach(() => {
          pubsubB.publish(topicTwo, `${topicTwo} from B`)
        }, R.range(0, 2))

        setTimeout(() => {
          expect(counterA).to.equal(4)
          pubsubA.test.removeListener(LOGGER_EVENT, validateReceiptInA)
          done()
        }, 500)
      })

      it(`'publish' event only emitted by the publishing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validatePublishInA = (data) => {
          const type = data.type

          if (type !== 'publish') return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal('publish')
          expect(timestamp).to.exist

          counterA++
        }

        const validatePublishInB = (data) => {
          const type = data.type

          if (type !== 'publish') return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeBid)
          expect(type).to.equal('publish')
          expect(timestamp).to.exist

          counterB++
        }

        pubsubA.test.on(LOGGER_EVENT, validatePublishInA)
        pubsubB.test.on(LOGGER_EVENT, validatePublishInB)

        R.forEach(() => {
          pubsubA.publish(topicOne, `${topicOne} from A`)
          pubsubA.publish(topicTwo, `${topicTwo} from A`)
        }, R.range(0, 2))

        R.forEach(() => {
          pubsubB.publish(topicOne, `${topicOne} from B`)
          pubsubB.publish(topicTwo, `${topicTwo} from B`)
        }, R.range(0, 2))

        setTimeout(() => {
          expect(counterA).to.equal(4)
          expect(counterB).to.equal(4)

          pubsubA.test.removeListener(LOGGER_EVENT, validatePublishInA)
          pubsubB.test.removeListener(LOGGER_EVENT, validatePublishInB)

          done()
        }, 500)
      })

      it(`'unsubscribe' event only emitted by the unsubscribing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateEventA = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(`unsubscribe`)
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        const validateEventB = () => counterB++

        pubsubA.test.on(LOGGER_EVENT, validateEventA)
        pubsubB.test.on(LOGGER_EVENT, validateEventB)

        pubsubA.unsubscribe(topicOne)

        setTimeout(() => {
          // ensure the logger works
          expect(counterA).to.equal(1)
          expect(counterB).to.equal(0)

          // ensure the call was proxied correctly
          const peersB = pubsubB.getPeerSet()
          const peerAinB = peersB[nodeAid]
          expect(R.values(peersB).length).to.equal(1)
          expect(peerAinB.topics).to.eql([])

          pubsubA.test.removeListener(LOGGER_EVENT, validateEventA)
          pubsubB.test.removeListener(LOGGER_EVENT, validateEventB)

          done()
        }, 500)
      })
    })

    describe(`Multiple topics (${topicOne}, ${topicTwo}):`, () => {
      const topicOneAPubs = 3
      const topicOneBPubs = 3

      const topicTwoAPubs = 3
      const topicTwoBPubs = 3

      const topicPubCount = topicOneAPubs + topicTwoAPubs + topicOneBPubs + topicTwoBPubs

      before((done) => {
        pubsubA.subscribe(topicOne)
        pubsubA.subscribe(topicTwo)
        setTimeout(() => {
          done()
        }, 1000)
      })

      it(`'receive' events emitted when receiving publications on relevant topics from all nodes (self included)`, (done) => {
        let counterA = 0

        const validateReceiptInA = (data) => {
          const type = data.type

          if (type !== 'receive') return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal('receive')
          expect(timestamp).to.exist

          counterA++
        }

        pubsubA.test.on(LOGGER_EVENT, validateReceiptInA)

        // Pubsub A
        R.forEach(() => {
          pubsubA.publish(topicOne, `${topicOne} from A`)
        }, R.range(0, topicOneAPubs))

        R.forEach(() => {
          pubsubA.publish(topicTwo, `${topicTwo} from A`)
        }, R.range(0, topicTwoAPubs))

        // Pubsub B
        R.forEach(() => {
          pubsubB.publish(topicOne, '${topicOne} from B')
        }, R.range(0, topicOneBPubs))

        R.forEach(() => {
          pubsubB.publish(topicTwo, `${topicTwo} from B`)
        }, R.range(0, topicTwoBPubs))

        setTimeout(() => {
          expect(counterA).to.equal(topicPubCount)
          pubsubA.test.removeListener(LOGGER_EVENT, validateReceiptInA)
          done()
        }, 500)
      })

    })
  })
})
