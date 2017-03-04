import * as diplomacy from "js-diplomacy"
import { Game } from "../game"
import { PlayerBase } from "./player-base"

declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

const Orders = diplomacy.standardRule.Order

export class RandomPlayer<Power> extends PlayerBase<Power> {
  protected evaluateOrders (game: Game<Power>, orders: Set<Order<Power>>): number {
    return Math.random()
  }
}
