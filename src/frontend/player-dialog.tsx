import * as React from "react"
import * as diplomacy from "js-diplomacy"

import { MkPlayer, PlayerSelector } from "./player-selector"
import { PlayerBase } from "../player/player-base"

declare function $(name: string): any

export interface Props {
  candidates: Array<MkPlayer | null>
  onSelected?: (results: Map<diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power> | null>) => void
}

export class PlayerDialog extends React.Component<Props, {}> {
  constructor (props: Props) {
    super(props)
    this.players = new Map()
  }
  render () {
    const selectors = Array.from(diplomacy.standardMap.map.powers).map(power => {
      return <div className="row" key={diplomacy.standardMap.Power[power]}>
        <div className="col-md-4">{diplomacy.standardMap.Power[power]}</div>
        <div className="col-md-8">
          <PlayerSelector
            candidates={this.props.candidates}
            ref={(selector) => {this.players.set(power, selector)}}/>
        </div>
      </div>
    })
    return <div className="modal fade player-dialog">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-body">
            {selectors}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" data-dismiss="modal">
              Cance
            </button>
            <button type="button" className="btn btn-primary" onClick={() => this.onSelected()}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  }

  open () {
    $('.player-dialog').modal('show')
  }
  close () {
    $('.player-dialog').modal('hide')
  }

  private onSelected () {
    this.close()
    if (this.props.onSelected) {
      const results = new Map(Array.from(this.players).map(elem => {
        const r = elem[1].get()
        if (r) {
          return [elem[0], r[1](elem[0])] as [diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power> | null]
        } else {
          return [elem[0], null] as [diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power> | null]
        }
      }))

      // human should be < 1
      if (Array.from(results).filter(elem => elem[1] === null).length <= 1) {
        this.props.onSelected(results)
      }
    }
  }

  private players: Map<diplomacy.standardMap.Power, PlayerSelector>
}
