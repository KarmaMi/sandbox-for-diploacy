import * as chai from "chai"
import { Game } from "./../src/game"
import { PlayerBase } from "./../src/player/player-base"
import * as diplomacy from "js-diplomacy"

const should = chai.should()

declare type Power = diplomacy.standardMap.Power
declare type Board = diplomacy.standardRule.Board<Power>
declare type Order = diplomacy.standardRule.Order.Order<Power>

const Orders = diplomacy.standardRule.Order

class Player extends PlayerBase<Power> {
  protected evaluateOrders (game: Game<Power>, orders: Set<Order>): number {
    return Array.from(orders).filter(x => x.tpe === Orders.OrderType.Hold).length
  }
}

interface PlayerWhiteBox {
  randomNeighbor (board: Board, original: Set<Order>): Set<Order> | null
}

describe("A player-base", () => {
  describe("when the game is movement phase", () => {
    it("replaces one order with another order", () => {
      const board = <Board>diplomacy.standard.variant.initialBoard
      const game = new Game([], board)

      const player = new Player(
        {
          simulatedAnnealingIteration: 10,
          alpha: 0.9,
          optimizeIteration: 1
        },
        diplomacy.standardMap.Power.England
      )
      const whiteBoxPlayer = <PlayerWhiteBox>(<any>player)
      const allHolds = new Set(
        Array.from(game.board.units)
          .filter(unit => unit.power === diplomacy.standardMap.Power.England)
          .map(unit => new Orders.Hold(unit))
        )

      for (let i = 0; i < 100; i++) {
        const n = whiteBoxPlayer.randomNeighbor(board, allHolds)
        should.not.equal(n, null)
        if (n) {
          Array.from(n).should.not.deep.equal(Array.from(allHolds))
          Array.from(n).filter(o => o.tpe === Orders.OrderType.Hold).length.should.equal(2)
        }
      }
    })
    it("optmizes orders", () => {
      const board = <Board>diplomacy.standard.variant.initialBoard
      const game = new Game([], board)

      const player = new Player(
        {
          simulatedAnnealingIteration: 10,
          alpha: 0.9,
          optimizeIteration: 1
        },
        diplomacy.standardMap.Power.England
      )

      let values = []
      for (let i = 0; i < 100; i++) {
        values.push(player.nextOrders(game))
      }

      values.map(x => Array.from(x).map(x => x.tpe)).should.deep.include(
        [Orders.OrderType.Hold, Orders.OrderType.Hold, Orders.OrderType.Hold]
      )
    })
  })
})
