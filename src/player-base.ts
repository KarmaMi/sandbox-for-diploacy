import * as diplomacy from "js-diplomacy"
import { Game } from "./game"
import { SimulatedAnnealing } from "./optimizer"

export declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

const Utils = diplomacy.standardRule.Utils
const MilitaryBranch = diplomacy.standardRule.MilitaryBranch
const Phase = diplomacy.standardRule.Phase
const Orders = diplomacy.standardRule.Order
const OrderType = Orders.OrderType

export interface PlayerBaseConfigs {
  simulatedAnnealingIteration: number
  alpha: number
  optimizeIteration: number
}

export abstract class PlayerBase<Power> {
  constructor (private configs: PlayerBaseConfigs, private power: Power) {}

  nextOrders (game: Game<Power>): Set<Order<Power>> {
    switch (game.board.state.phase) {
      case Phase.Movement:
        return this.nextMovementOrders(game)
      case Phase.Retreat:
        return new Set() // TODO
      case Phase.Build:
        return new Set() // TODO
    }
  }

  protected abstract evaluateOrders (game: Game<Power>, orders: Set<Order<Power>>): number

  private nextMovementOrders (game: Game<Power>): Set<Order<Power>> {
    const $$ = new diplomacy.standardRule.Helper(game.board)

    // orders that all units hold
    const allHolds = new Set(
      Array.from(game.board.units)
        .filter(unit => unit.power === this.power)
        .map(unit => new Orders.Hold(unit))
      )
    const eForAllHolds = this.evaluateOrders(game, allHolds)

    // Initialize simulated annealing
    /* Decide initial temprature */
    let diffSum = 0
    let num = 0
    for (let i = 0; i < 10; i++) {
      const n = this.randomNeighbor(game.board, allHolds)
      if (n) {
        diffSum = Math.abs(eForAllHolds - this.evaluateOrders(game, n))
        num += 1
      }
    }

    let initialTemprature = 1000
    if (num !== 0) {
      initialTemprature = (diffSum / num) / Math.log(2)
    }

    /* Instanciate simulated annealing */
    const optimizer = new SimulatedAnnealing({
      iteration: this.configs.simulatedAnnealingIteration,
      alpha: this.configs.alpha,
      initialTemprature: initialTemprature,
      randomNeighbor: orders => this.randomNeighbor(game.board, orders),
      evaluate: (target: Set<Order<Power>>) => -this.evaluateOrders(game, target)
    })

    // Optimize
    let optimal = allHolds
    let e = eForAllHolds
    for (let i = 0; i < this.configs.optimizeIteration; i++) {
      const c = optimizer.optimize(allHolds)
      const e2 = this.evaluateOrders(game, c)

      if (e2 > e) {
        optimal = c
        e = e2
      }
    }
    return optimal
  }

  private randomNeighbor (board: Board<Power>, original: Set<Order<Power>>): Set<Order<Power>> | null {
    const $$ = new diplomacy.standardRule.Helper(board)

    const origArray = Array.from(original)
    // decide an unit to be replaced
    const index = Math.floor(Math.random() * origArray.length)
    const target = origArray[index]
    const unit = target.unit

    let orderType = OrderType.Hold
    if (Utils.canConvoy(board.map, unit)) {
      // Can convoy
      switch (Math.floor(Math.random() * 3)) {
        case 0:
          orderType = OrderType.Move // including Hold
          break
        case 1:
          orderType = OrderType.Support
          break
        case 2:
          orderType = OrderType.Convoy
          break
      }
    } else {
      switch (Math.floor(Math.random() * 2)) {
        case 0:
          orderType = OrderType.Move // including Hold
          break
        case 1:
          orderType = OrderType.Support
          break
      }
    }

    let arr = origArray
    const replaceByMoveOrHold = () => {
      const candidates = Utils.movableLocationsOf(board, unit)

      if (!(target instanceof Orders.Hold)) {
        candidates.add(unit.location)
      }

      if (target instanceof Orders.Move) {
        candidates.delete(target.destination)
      }

      const cs = Array.from(candidates)

      const cIndex = Math.floor(Math.random() * cs.length)

      const loc = cs[cIndex]
      if (loc === unit.location) {
        // Hold
        arr[index] = new Orders.Hold(unit)
      } else {
        // Move
        arr[index] = new Orders.Move(unit, loc)
      }
      return true
    }
    const replaceBySupport = () => {
      const supportable = Utils.supportableLocationsOf(board.map, unit)
      const candidates = new Set()
      // Units of the same power
      original.forEach(order => {
        if (order instanceof diplomacy.standardRule.Order.Move) {
          if (supportable.has(order.destination)) {
            candidates.add(new Orders.Support(unit, order))
          }
        } else {
          if (supportable.has(order.unit.location)) {
            candidates.add(new Orders.Support(unit, new Orders.Hold(order.unit)))
          }
        }
      })

      // Units of the other powers
      board.units.forEach(unit2 => {
        if (unit2.power === this.power) return

        const ls =
          Array.from(Utils.movableLocationsOf(board, unit2)).filter(l => supportable.has(l))
        ls.forEach(l => {
          candidates.add(new Orders.Support(unit, new Orders.Move(unit2, l)))
        })

        if (supportable.has(unit2.location)) {
          candidates.add(new Orders.Support(unit, new Orders.Hold(unit2)))
        }
      })

      let cs = Array.from(candidates)
      if (target instanceof Orders.Support) {
        cs = cs.filter(x => {
          (x.destination === target.destination) && (x.target.unit === target.target.unit)
        })
      }

      if (cs.length !== 0) {
        const cIndex = Math.floor(Math.random() * cs.length)
        arr[index] = cs[cIndex]
        return true
      } else {
        return false
      }
    }
    const replaceByConvoy = () => {
      const candidates = new Set()

      // Units of the same power
      original.forEach(order => {
        if (order instanceof diplomacy.standardRule.Order.Move) {
          if (
            Utils.isMovableViaSea(board.map, order.unit.location.province, unit.location.province, board.units) &&
            Utils.isMovableViaSea(board.map, unit.location.province, order.destination.province, board.units)
          ) {
            candidates.add(new Orders.Convoy(unit, order))
          }
        }
      })

      // Units of the other powers
      board.units.forEach(unit2 => {
        if (unit2.power === this.power) return

        const ls =
          Array.from(Utils.movableViaConvoyLocationsOf(board, unit2))
        ls.forEach(l => {
          if (
            Utils.isMovableViaSea(board.map, unit2.location.province, unit.location.province, board.units) &&
            Utils.isMovableViaSea(board.map, unit.location.province, l.province, board.units)
          ) {
            candidates.add(new Orders.Convoy(unit, new Orders.Move(unit2, l)))
          }
        })
      })

      let cs = Array.from(candidates)
      if (target instanceof Orders.Convoy) {
        cs = cs.filter(x => {
          (x.target.destination === target.target.destination) && (x.target.unit === target.target.unit)
        })
      }

      if (cs.length !== 0) {
        const cIndex = Math.floor(Math.random() * cs.length)
        arr[index] = cs[cIndex]
        return true
      } else {
        return false
      }
    }

    switch (orderType) {
      case OrderType.Support:
        if (!replaceByConvoy()) {
          // If there is no valid support orders, use hold or move
          replaceByMoveOrHold()
        }
        break
      case OrderType.Convoy:
        if (!replaceByConvoy()) {
          // If there is no valid convoy orders, use hold or move
          replaceByMoveOrHold()
        }
        break
      case OrderType.Hold:
      case OrderType.Move:
        replaceByMoveOrHold()
        break
    }
    return new Set(arr)
  }
}
