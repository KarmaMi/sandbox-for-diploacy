import * as diplomacy from "js-diplomacy"

export declare type Board<Power> = diplomacy.standardRule.Board<Power>
export declare type Order<Power> = diplomacy.standardRule.Order.Order<Power>

export interface PastState<Power> {
  board: Board<Power>
  orders: Set<Order<Power>>
}

export class Game<Power> {
  constructor (
    public pastStates: Array<PastState<Power>>,
    public board: Board<Power>
  ) {}
}
