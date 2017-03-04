import * as diplomacy from "js-diplomacy"
import { Game } from "../game"
import { PlayerBaseConfigs, PlayerBase } from "./player-base"
import I from "./province-importance"

declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

const Orders = diplomacy.standardRule.Order

export interface DefensivePlayerConfigs<Power> extends PlayerBaseConfigs {
  importanceIteration: number
  map: diplomacy.standardRule.DiplomacyMap<Power>
}

export class DefensivePlayer<Power> extends PlayerBase<Power> {
  importance: Map<diplomacy.board.Province<Power>, number>
  rule: diplomacy.standardRule.Rule<Power>
  constructor (configs: DefensivePlayerConfigs<Power>, power: Power) {
    super(configs, power)
    this.importance = I(configs.importanceIteration, configs.map)
    this.rule = new diplomacy.standardRule.Rule<Power>()
  }
  protected evaluateOrders (game: Game<Power>, orders: Set<Order<Power>>): number {
    let value = 0
    orders.forEach(order => {
      if (order instanceof Orders.Support) {
        value += this.importance.get(order.unit.location.province) || 0
        if (order.target.tpe === Orders.OrderType.Hold) {
          const t = Array.from(orders).find(o => o.unit === order.target.unit)
          if (t && t.tpe !== Orders.OrderType.Move) {
            value += this.importance.get(order.destination.province) || 0
          }
        }
      } else if (order instanceof Orders.Move) {
        value += this.importance.get(order.destination.province) || 0
      } else {
        value += this.importance.get(order.unit.location.province) || 0
      }
    })
    return value
  }
}
