import * as React from "react"
import * as diplomacy from "js-diplomacy"

import { PlayerBase } from "../player/player-base"

export interface Props {
  power: diplomacy.standardMap.Power
}

export interface State {
  progress: number
}

export class PlayerProgress extends React.Component<Props, State> {
  constructor (props: Props) {
    super(props)
    this.state = { progress: 0 }
  }
  render () {
    return <div className="row">
      <div className="col-md-4">{diplomacy.standardMap.Power[this.props.power]}</div>
      <div className="col-md-8">
        <div style={{
          width: "100%",
          backgroundColor: "gray",
          height: "15px",
          margin: "2.5px"
        }}>
          <div style={{
            width: `${Math.min(100, this.state.progress * 100)}%`,
            backgroundColor: "green",
            height: "15px"
          }} />
        </div>
      </div>
    </div>
  }

  complete () {
    this.setState({ progress: 2})
  }
  setProgress (progress: number) {
    this.setState({ progress: progress})
  }
}
