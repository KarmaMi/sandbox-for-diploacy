import * as diplomacy from "js-diplomacy"
import { Game } from "../game"
import { PlayerBase } from "./player-base"
import I from "./province-importance"

declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

const Orders = diplomacy.standardRule.Order
const Utils = diplomacy.standardRule.Utils

export class EstimationTarget<Power> {
  constructor (
    public power: Power, public target: diplomacy.board.Province<Power>,
    public from: diplomacy.board.Province<Power> | null
  ) {}
}

export interface RuleBasedPlayerConfigs<Power> {
  importanceIteration: number
  map: diplomacy.standardRule.DiplomacyMap<Power>
}

export class RuleBasedPlayer<Power> extends PlayerBase<Power> {
  importance: Map<diplomacy.board.Province<Power>, number>
  rule: diplomacy.standardRule.Rule<Power>
  constructor (private configs: RuleBasedPlayerConfigs<Power>, power: Power) {
    super(power)
    this.importance = I(configs.importanceIteration, configs.map)
    this.rule = new diplomacy.standardRule.Rule<Power>()
  }

  protected mkEvaluateOrders (game: Game<Power>): (orders: Set<Order<Power>>) => number {
    // Distance
    const D = new Map()
    const visited = new Set()
    const getD = (province: diplomacy.board.Province<Power>): number => {
      if (D.has(province)) {
        return D.get(province)
      }

      if (visited.has(province)) {
        return 1e10
      }
      visited.add(province)

      const s = game.board.provinceStatuses.get(province)

      if (Array.from(game.board.units).some(unit => {
        return (unit.power !== this.power) && (unit.location.province === province)
      })) {
        D.set(province, 0)
        return 0
      } else if (province.isSupplyCenter && s && s.occupied !== this.power) {
        D.set(province, 0)
        return 0
      } else {
        const neighbors1 =
          game.board.map.movableProvincesOf(province, diplomacy.standardRule.MilitaryBranch.Army)
        const neighbors2 =
          game.board.map.movableProvincesOf(province, diplomacy.standardRule.MilitaryBranch.Fleet)

        const neighbors = new Set(Array.from(neighbors1).concat(Array.from(neighbors2)))
        const d = Math.min(...Array.from(neighbors).map(p => getD(p))) + 1
        D.set(province, d)
        return d
      }
    }
    game.board.map.provinces.forEach(province => {
      getD(province)
    })

    const I = (province: diplomacy.board.Province<Power>): number => {
      return Math.pow(0.5, getD(province)) * (this.importance.get(province) || 0)
    }

    // Precompute (Units of other powers)
    const preEstimation: Array<[EstimationTarget<Power>, number]> = []
    game.board.units.forEach(unit => {
      if (unit.power === this.power) {
        return
      }

      const ls = Array.from(game.board.map.movableLocationsOf(unit.location, unit.militaryBranch))
      ls.push(unit.location)

      const ps = new Set(ls.map(l => l.province))
      ps.forEach(province => {
        const elem =
          preEstimation.find(elem => {
            return (elem[0].power === unit.power) && (elem[0].target === province)
          })
        if (elem) {
          elem[1] += 1
        } else {
          preEstimation.push([
            new EstimationTarget(unit.power, province, null),
            1
          ])
        }
      })
    })


    return (orders: Set<Order<Power>>) => {
      if (game.board.state.phase === diplomacy.standardRule.Phase.Retreat) {
        let value = 0
        orders.forEach(order => {
          if (order instanceof Orders.Retreat) {
            value += I(order.destination.province)
          } else {
            value -= I(order.unit.location.province)
          }
        })
        return value
      }

      if (game.board.state.phase === diplomacy.standardRule.Phase.Build) {
        let value = 0
        orders.forEach(order => {
          if (order instanceof Orders.Build) {
            const o: diplomacy.standardRule.Order.Order<Power> = order
            const xs = Array.from(game.board.map.movableLocationsOf(o.unit.location, o.unit.militaryBranch))
            const ps = new Set(xs.map(x => x.province))
            value += I(o.unit.location.province)
            ps.forEach(p => {
              value += I(p)
            })
          } else {
            const o: diplomacy.standardRule.Order.Order<Power> = order
            value -= I(o.unit.location.province)
          }
        })
        return value
      }

      const os = Array.from(orders)
      const supports = os.filter(x => x instanceof Orders.Support)
      const convoys = os.filter(x => x instanceof Orders.Convoy)

      const estimation: Array<[EstimationTarget<Power>, number]> = []
      preEstimation.forEach(p => {
        estimation.push([
          new EstimationTarget(p[0].power, p[0].target, p[0].from),
          p[1]
        ])
      })

      // Check move orders
      orders.forEach(order => {
        if (order instanceof Orders.Move) {
          if (!game.board.map.movableLocationsOf(order.unit.location, order.unit.militaryBranch)
            .has(order.destination)) {
            // Via convoy
            const units = convoys.filter((convoy: diplomacy.standardRule.Order.Convoy<Power>) => {
              return (convoy.target.unit === order.unit) && (convoy.target.destination === order.destination)
            }).map(o => o.unit)
            if (!Utils.isMovableViaSea(
              game.board.map, order.unit.location.province, order.destination.province, new Set(units)
            )) {
              // The move order will fail
              return
            }
          }
          // The move order may success
          estimation.push([
            new EstimationTarget(this.power, order.destination.province, order.unit.location.province),
            1
          ])
        } else {
          estimation.push([
            new EstimationTarget(this.power, order.unit.location.province, order.unit.location.province),
            1
          ])
        }
      })

      supports.forEach((support: diplomacy.standardRule.Order.Support<Power>) => {
        if (support.target.unit.power === this.power) {
          const elem =
            estimation.find(elem => {
              return (elem[0].power === support.target.unit.power) &&
                (elem[0].target === support.destination.province) &&
                (elem[0].from === support.target.unit.location.province)
            })
          if (elem) {
            elem[1] += 1
          }
        } else {
          const elem =
            estimation.find(elem => {
              return (elem[0].power === support.target.unit.power) &&
                (elem[0].target === support.destination.province)
            })
          if (elem) {
            elem[1] += 0.1
          } else {
            estimation.push([
              new EstimationTarget(support.target.unit.power, support.destination.province, null),
              0.1
            ])
          }
        }
      })

      // evalute orders
      let value = 0
      game.board.map.provinces.forEach(province => {
        const elems = estimation.filter(elem => elem[0].target === province)
        const maxValue = Math.max(...(elems.map(x => x[1])))

        const maxElems = elems.filter(x => x[1] === maxValue)

        if (maxElems.length === 0) {
          const status = game.board.provinceStatuses.get(province)
          if (status && province.isSupplyCenter && status.occupied !== this.power) {
            value -= I(province)
          } else {
            value += I(province)
          }
          return
        }

        if (maxElems.length != 1) {
          return
        }

        if (maxElems.find(x => x[0].power === this.power)) {
          value += I(province)
        } else {
          value -= I(province)
        }
      })

      return value
    }
  }
}
