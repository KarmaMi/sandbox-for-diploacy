import * as React from "react"
import * as diplomacy from "js-diplomacy"

import { Selector } from "./selector"
import { PlayerBase } from "../player/player-base"

export declare type MkPlayer =
  [string, (power: diplomacy.standardMap.Power) => (PlayerBase<diplomacy.standardMap.Power> | null)]

export class PlayerSelector extends Selector<MkPlayer> {
  protected stringify(mkPlayer: MkPlayer) {
    return mkPlayer[0]
  }
}
