/* eslint-env mocha */
'use strict'

const R = require('ramda')
const expect = require('chai').expect
// Note: require('libp2p-floodsub') throws: Cannot find module 'libp2p-floodsub'
const PS = require('./../node_modules/libp2p-floodsub/src')
const libp2p = require('libp2p-ipfs')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const addLogger = require('./../src')
const keys = require('./fixtures/keys').keys
const { PUBLISH_EVENT, RECEIVE_EVENT, SUBSCRIBE_EVENT, UNSUBSCRIBE_EVENT } = require('./../src/config')

const NUM_NODES = 2

const mapIndexed = R.addIndex(R.map)

describe(`Multiple Loggers:`, () => {
  let nodeA
  let nodeAid
  let loggerA
  let pubsubA

  let nodeB
  let nodeBid
  let loggerB
  let pubsubB

  const topicOne = 'Topic One'
  const topicTwo = 'Topic Two'

  let nodes = []
  let pubsubs = []
  let loggers = []

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
      let privKey = keys[idx].privKey

      // Peer info
      let peerId = PeerId.createFromPrivKey(privKey)
      let peerInstance = new PeerInfo(peerId)
      let peerAddr1 = multiaddr(`/ip4/127.0.0.1/tcp/${12000+idx}/ipfs/${peerInstance.id.toB58String()}`)
      peerInstance.multiaddr.add(peerAddr1)

      // Libp2p info
      let libp2pInstance = new libp2p.Node(peerInstance)

      // The network node instance
      let testNode = {
        peerInfo: peerInstance,
        libp2p: libp2pInstance,
      }
      nodes.push(testNode)

      let pubsub = PS(testNode.libp2p)
      pubsubs.push(pubsub)

      let logger = addLogger(pubsub, testNode.peerInfo.id.toB58String())
      loggers.push(logger)

      return testNode.libp2p.start(noop)
    }, nodeCount)

    nodeA = nodes[0]
    pubsubA = pubsubs[0]
    loggerA = loggers[0]
    nodeAid = nodeA.peerInfo.id.toB58String()

    nodeB = nodes[1]
    pubsubB = pubsubs[1]
    loggerB = loggers[1]
    nodeBid = nodeB.peerInfo.id.toB58String()

    Promise.all(startFns)
      .then(() => {
        setTimeout(done, 1000)
      })
  })

  describe('2 Loggers (A, B):', () => {

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

      // before((done) => {
      //   setTimeout(() => {
      //     done()
      //     pubsubA.subscribe(topicOne)
      //   }, 200)
      // })

      // after((done) => {
      //   setTimeout(() => {
      //     done()
      //     pubsubA.unsubscribe(topicOne)
      //   }, 200)
      // })

      it(`'${SUBSCRIBE_EVENT}' event only emitted by the subscribing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateEventA = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(SUBSCRIBE_EVENT)
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        const validateEventB = () => counterB++

        loggerA.on(SUBSCRIBE_EVENT, validateEventA)
        loggerB.on(SUBSCRIBE_EVENT, validateEventB)

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

          loggerA.removeListener(SUBSCRIBE_EVENT, validateEventA)
          loggerB.removeListener(SUBSCRIBE_EVENT, validateEventB)

          done()
        }, 500)
      })

      it(`'${RECEIVE_EVENT}' events emitted when receiving publications on relevant topics from all nodes (self included)`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateReceiptInA = (data) => {
          const type = data.type

          if (type !== RECEIVE_EVENT) return

          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(RECEIVE_EVENT)
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        loggerA.on(RECEIVE_EVENT, validateReceiptInA)

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
          loggerA.removeListener(RECEIVE_EVENT, validateReceiptInA)
          done()
        }, 500)
      })

      it(`'${PUBLISH_EVENT}' event only emitted by the publishing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validatePublishInA = (data) => {
          const type = data.type

          if (type !== PUBLISH_EVENT) return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(PUBLISH_EVENT)
          expect(timestamp).to.exist

          counterA++
        }

        const validatePublishInB = (data) => {
          const type = data.type

          if (type !== PUBLISH_EVENT) return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeBid)
          expect(type).to.equal(PUBLISH_EVENT)
          expect(timestamp).to.exist

          counterB++
        }

        loggerA.on(PUBLISH_EVENT, validatePublishInA)
        loggerB.on(PUBLISH_EVENT, validatePublishInB)

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

          loggerA.removeListener(PUBLISH_EVENT, validatePublishInA)
          loggerB.removeListener(PUBLISH_EVENT, validatePublishInB)

          done()
        }, 500)
      })

      it(`'${UNSUBSCRIBE_EVENT}' event only emitted by the unsubscribing node`, (done) => {
        let counterA = 0
        let counterB = 0

        const validateEventA = (data) => {
          const type = data.type
          const source = data.source
          const topic = data.args[0]
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(UNSUBSCRIBE_EVENT)
          expect(topic).to.equal(topicOne)
          expect(timestamp).to.exist

          counterA++
        }

        const validateEventB = () => counterB++

        loggerA.on(UNSUBSCRIBE_EVENT, validateEventA)
        loggerB.on(UNSUBSCRIBE_EVENT, validateEventB)

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

          loggerA.removeListener(UNSUBSCRIBE_EVENT, validateEventA)
          loggerB.removeListener(UNSUBSCRIBE_EVENT, validateEventB)

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

      it(`'${RECEIVE_EVENT}' events emitted when receiving publications on relevant topics from all nodes (self included)`, (done) => {
        let counterA = 0

        const validateReceiptInA = (data) => {
          const type = data.type

          if (type !== RECEIVE_EVENT) return

          const source = data.source
          const timestamp = data.timestamp

          expect(source).to.equal(nodeAid)
          expect(type).to.equal(RECEIVE_EVENT)
          expect(timestamp).to.exist

          counterA++
        }

        loggerA.on(RECEIVE_EVENT, validateReceiptInA)

        // Pubsub A
        R.forEach(() => {
          pubsubA.publish(topicOne, `${topicOne} from A and this is a much longer message`)
        }, R.range(0, topicOneAPubs))

        R.forEach(() => {
          pubsubA.publish(topicTwo, `${topicTwo} from A`)
        }, R.range(0, topicTwoAPubs))

        // Pubsub B
        R.forEach(() => {
          pubsubB.publish(topicOne, `${topicOne} from B`)
        }, R.range(0, topicOneBPubs))

        R.forEach(() => {
          pubsubB.publish(topicTwo, `${topicTwo} from B`)
        }, R.range(0, topicTwoBPubs))

        setTimeout(() => {
          expect(counterA).to.equal(topicPubCount)
          loggerA.removeListener(RECEIVE_EVENT, validateReceiptInA)
          done()
        }, 500)
      })
    })
  })
})
