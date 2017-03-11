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
    // Precompute (Units of other powers)
    const preEstimation: Array<[EstimationTarget<Power>, number]> = []
    game.board.units.forEach(unit => {
      if (unit.power === this.power) {
        return
      }

      const ls = Array.from(Utils.movableLocationsOf(game.board, unit))
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
            value += this.importance.get(order.destination.province) || 0
          } else {
            value -= this.importance.get(order.unit.location.province) || 0
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
            value += this.importance.get(o.unit.location.province) || 0
            ps.forEach(p => {
              value += this.importance.get(p) || 0
            })
          } else {
            const o: diplomacy.standardRule.Order.Order<Power> = order
            value -= this.importance.get(o.unit.location.province) || 0
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
            elem[1] += 1
          } else {
            estimation.push([
              new EstimationTarget(support.target.unit.power, support.destination.province, null),
              1
            ])
          }
        }
      })

      // evalute orders
      let value = 0
      game.board.map.provinces.forEach(province => {
        const elems = estimation.filter(elem => elem[0].target === province)
        const maxValue = Math.max(...(elems.map(x => x[1]))) // Too heavy

        const maxElems = elems.filter(x => x[1] === maxValue)

        const status = game.board.provinceStatuses.get(province)
        if (maxElems.length == 0 && status && status.occupied === this.power) {
          value += this.importance.get(province) || 0
          return
        }

        if (maxElems.length != 1) {
          return
        }

        if (maxElems.find(x => x[0].power === this.power)) {
          value += this.importance.get(province) || 0
        } else {
          value -= this.importance.get(province) || 0
        }
      })

      return value
    }
  }
}
