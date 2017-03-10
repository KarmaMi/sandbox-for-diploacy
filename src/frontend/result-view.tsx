import * as React from "react"
import * as diplomacy from "js-diplomacy"

export class ResultView
  extends React.Component<{result: diplomacy.rule.OrderResult<diplomacy.standardMap.Power, diplomacy.standardRule.MilitaryBranch, diplomacy.standardRule.Result>}, {}> {

  render () {
    return <div className="row">
      <div className="col-md-4">{this.props.result.target.toString()}</div>
      <div className="col-md-8">{diplomacy.standardRule.Result[this.props.result.result]}</div>
    </div>
  }
}
