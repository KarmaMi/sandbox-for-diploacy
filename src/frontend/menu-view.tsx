import * as React from 'react'

export interface Prop {
  onResolve: () => void
  onStartNewGame: () => void
}

export interface State {
  canResolve: boolean
}

export class MenuView extends React.Component<Prop, State> {
  constructor (prop: Prop) {
    super(prop)
    this.state = { canResolve: false }
  }
  render (): JSX.Element {
    if (this.state.canResolve) {
      return <nav className="navbar navbar-default">
        <ul className="nav navbar-nav">
          <li>
            <a className="navbar-link" href="#" onClick={() => this.props.onStartNewGame()}>New Game</a>
          </li>
          <li>
            <a className="navbar-link" href="#" onClick={this.props.onResolve}>Resolve</a>
          </li>
        </ul>
      </nav>
    } else {
      return <nav className="navbar navbar-default">
        <ul className="nav navbar-nav">
          <li>
            <a className="navbar-link" href="#" onClick={() => this.props.onStartNewGame()}>New Game</a>
          </li>
        </ul>
      </nav>
    }
  }
  disableResolve () {
    this.setState({ canResolve: false })
  }
  enableResolve () {
    this.setState({ canResolve: true })
  }
}
