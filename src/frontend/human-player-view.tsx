import * as ReactDom from "react-dom"
import * as React from "react"
import * as diplomacy from "js-diplomacy"
import * as vizdip from "vizdip"

export interface Props {
  board: diplomacy.standardRule.Board<diplomacy.standardMap.Power>
}

export class HumanPlayerView extends React.Component<Props, {}> {
  render () {
    // TODO order
    return <div className="row">
      <div className="col-md-8">
        <div className="page-header">
          <h3>Map</h3>
        </div>
        <div>
          <vizdip.standardMap.BoardComponent board={this.props.board} orders={new Set()}/>
        </div>
      </div>
      <div className="col-md-4"></div>
    </div>
  }
}
