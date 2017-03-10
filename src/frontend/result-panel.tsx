import * as React from "react"
import * as diplomacy from "js-diplomacy"

import { ResultView } from "./result-view"

export class ResultPanel
  extends React.Component<{result: Set<diplomacy.rule.OrderResult<diplomacy.standardMap.Power, diplomacy.standardRule.MilitaryBranch, diplomacy.standardRule.Result>>}, {}> {

  render () {
    const results = Array.from(this.props.result).map((r, index) => {
      return <ResultView result={r} key={index} />
    })
    return <div className="row">{results}</div>
  }
}
