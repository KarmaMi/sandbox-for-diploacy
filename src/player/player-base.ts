import * as diplomacy from "js-diplomacy"
import { Game } from "../game"
import { SimulatedAnnealing } from "../optimizer"

export declare type Unit<Power> = diplomacy.standardRule.Unit<Power>
export declare type Location<Power> = diplomacy.standardRule.Location<Power>
export declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

const ALPHA = 0.9
const OPTIMIZE_ITERATION = 1

const CANDIDATES_PER_UNIT = 5

const Utils = diplomacy.standardRule.Utils
const MilitaryBranch = diplomacy.standardRule.MilitaryBranch
const Phase = diplomacy.standardRule.Phase
const Orders = diplomacy.standardRule.Order
const OrderType = Orders.OrderType

// Ref: http://rextester.com/OUC90847
function combinations<T>(array: Array<T>, k: number): Set<Array<T>> {
  const combinations = new Set()
  let cs: Array<T> = []

  if (array.length < k) {
    return combinations
  }

  function run(level: number, start: number){
    for (let i = start; i < array.length - k + level + 1; i++) {
      cs[level] = array[i]
      if (level < k - 1) {
        run(level + 1, i + 1)
      } else {
        combinations.add(cs)
      }
    }
  }

  run(0, 0)
  return combinations
}

export abstract class PlayerBase<Power> {
  constructor (protected power: Power) {}

  nextOrdersAsync (game: Game<Power>, callback?: (progress: number) => void): Promise<Set<Order<Power>>> {
    return new Promise((resolve) => {
      setTimeout(
        () => resolve(this.nextOrders(game, callback)),
        0
      )
    })
  }

  nextOrders (game: Game<Power>, callback?: (progress: number) => void): Set<Order<Power>> {
    switch (game.board.state.phase) {
      case Phase.Movement:
        return this.nextMovementOrders(game, callback)
      case Phase.Retreat:
        return this.nextRetreatOrders(game)
      case Phase.Build:
        return this.nextBuildOrder(game)
    }
  }

  protected abstract evaluateOrders (game: Game<Power>, orders: Set<Order<Power>>): number

  private nextMovementOrders (game: Game<Power>, callback?: (progress: number) => void): Set<Order<Power>> {
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
    const numOfUnits = Array.from(game.board.units).filter(u => u.power === this.power).length
    const optimizer = new SimulatedAnnealing({
      iteration: Math.pow(CANDIDATES_PER_UNIT, numOfUnits),
      alpha: ALPHA,
      initialTemprature: initialTemprature,
      randomNeighbor: orders => this.randomNeighbor(game.board, orders),
      evaluate: (target: Set<Order<Power>>) => -this.evaluateOrders(game, target)
    })

    // Optimize
    let optimal = allHolds
    let e = eForAllHolds
    for (let i = 0; i < OPTIMIZE_ITERATION; i++) {
      const c = optimizer.optimize(allHolds, (progress: number) => {
        if (callback) {
          callback(
            (progress + i) / OPTIMIZE_ITERATION
          )
        }
      })
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
        if (order === target) return

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
        if (order === target) return
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
        if (!replaceBySupport()) {
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

  private nextRetreatOrders (game: Game<Power>, callback?: (progress: number) => void): Set<Order<Power>> {
    const units =
      Array.from(game.board.unitStatuses).filter(x => x[0].power === this.power)
    let orders = new Set(units.map(u => new Orders.Disband(u[0])))
    let e = this.evaluateOrders(game, orders)
    // Check all candidates
    function dfs (index: number, os: Set<Order<Power>>) {
      const [unit, status] = units[index]

      if (index === units.length - 1) {
        // Disband
        const c1 = new Set(Array.from(os))
        c1.add(new Orders.Disband(unit))
        const e1 = this.evaluateOrders(game, c1)
        if (e1 > e) {
          orders = c1
          e = e1
        }

        // Retreat
        Utils.locationsToRetreat(game.board, unit, status.attackedFrom).forEach(location => {
          const c1 = new Set(Array.from(os))
          c1.add(new Orders.Retreat(unit, location))
          const e1 = this.evaluateOrders(game, c1)
          if (e1 > e) {
            orders = c1
            e = e1
          }
        })
      } else {
        // Disband
        const c1 = new Set(Array.from(os))
        c1.add(new Orders.Disband(unit))
        dfs(index + 1, c1)

        // Retreat
        Utils.locationsToRetreat(game.board, unit, status.attackedFrom).forEach(location => {
          const c1 = new Set(Array.from(os))
          c1.add(new Orders.Retreat(unit, location))
          dfs(index + 1, c1)
        })
      }
    }
    if (callback) callback(0)
    dfs(0, new Set())
    if (callback) callback(1)

    return orders
  }

  private nextBuildOrder (game: Game<Power>, callback?: (progress: number) => void): Set<Order<Power>> {
    // TODO
    const n = Utils.numberOfBuildableUnits(game.board).get(this.power)

    if (n === undefined) {
      return new Set()
    }

    if (callback) callback(0)

    if (n > 0) {
      let orders = new Set()
      let e = this.evaluateOrders(game, orders)

      const homes =
        Array.from(game.board.map.locations).filter(l => {
          const status = game.board.provinceStatuses.get(l.province)
          return (l.province.homeOf === this.power) && l.province.isSupplyCenter &&
            (Array.from(game.board.units).every(u => u.location !== l)) &&
            (status && status.occupied === this.power)
        })

      for (let i = 1; i <= n; i++) {
        const cs = combinations(homes, i)

        const search = (locations: Array<Location<Power>>) => {
          const dfs = (index: number, os: Set<Order<Power>>) => {
            const l = locations[index]
            if (index === locations.length - 1) {
              l.militaryBranches.forEach(m => {
                const c1 = new Set(Array.from(os))
                c1.add(new Orders.Build<Power>(new diplomacy.standardRule.Unit(m, l, this.power)))

                const e1 = this.evaluateOrders(game, c1)
                if (e1 > e) {
                  orders = new Set(Array.from(c1))
                  e = e1
                }
              })
            } else {
              l.militaryBranches.forEach(m => {
                const c = new Set(Array.from(os))
                c.add(new Orders.Build<Power>(new diplomacy.standardRule.Unit(m, l, this.power)))
                dfs(index + 1, c)
              })
            }
          }
          dfs(0, new Set())
        }

        cs.forEach(candidate => {
          const ps = new Set(candidate.map(x => x.province))
          if (ps.size !== candidate.length) {
            return
          }

          search(candidate)
        })
      }
      return orders
    } else if (n < 0) {
      let orders: Set<Order<Power>> | null = null
      let e: number | null = null

      const units =
        Array.from(game.board.units).filter(u => u.power === this.power)
      const cs = combinations(units, -n)

      cs.forEach(candidate => {
        const c1 = new Set(candidate.map(u => new Orders.Disband(u)))
        const e1 = this.evaluateOrders(game, c1)

        if (orders && e) {
          if (e1 > e) {
            orders = c1
            e = e1
          }
        } else {
          orders = c1
          e = e1
        }
      })

      if (orders === null) {
        return new Set()
      } else {
        return orders
      }
    } else {
      return new Set()
    }
  }
}
