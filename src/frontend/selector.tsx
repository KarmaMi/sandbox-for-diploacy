import * as React from "react"

export abstract class Selector<T>
    extends React.Component<{ candidates: Array<T | null>, on?: (value: T | null) => void }, {}> {
  render () {
    const targetOptions = this.props.candidates.map(l => {
      if (l === null) {
        return <option key={"null"}></option>
      } else {
        return <option key={this.stringify(l)}>{this.stringify(l)}</option>
      }
    })
    return <select
      className={"select-picker"}
      disabled={this.props.candidates.length <= 1}
      onChange={() => {
        if (this.props.on) {
          this.props.on(this.get())
        }
      }}
      ref={(selector) => { this.selector = selector }}
    >
      {targetOptions}
    </select>
  }

  get () {
    return this.props.candidates[this.selector.selectedIndex]
  }
  protected abstract stringify (value: T): string
  private selector: HTMLSelectElement
}
