import * as ReactDom from "react-dom"
import * as React from "react"
import * as diplomacy from "js-diplomacy"
import * as vizdip from "vizdip"

import { Game } from "./game"

import { MenuView } from "./frontend/menu-view"
import { MkPlayer } from "./frontend/player-selector"
import { PlayerDialog } from "./frontend/player-dialog"
import { PlayerPanel } from "./frontend/player-panel"
import { ResultPanel } from "./frontend/result-panel"
import { HumanPlayerView } from "./frontend/human-player-view"

import { PlayerBase } from "./player/player-base"
import { RandomPlayer } from "./player/random-player"
import { DefensivePlayer } from "./player/defensive-player"
import { RuleBasedPlayer } from "./player/rule-based-player"

const configs = {
  importanceIteration: 1,
  map: diplomacy.standard.variant.initialBoard.map,
}

const players: Array<MkPlayer> = [
  ["random", (power: diplomacy.standardMap.Power) => new RandomPlayer(power)],
  ["rule", (power: diplomacy.standardMap.Power) => new RuleBasedPlayer(configs, power)],
  ["defensive", (power: diplomacy.standardMap.Power) => new DefensivePlayer(configs, power)],
  ["human", (power: diplomacy.standardMap.Power) => null]
]

interface State {
  game: Game<diplomacy.standardMap.Power> | null
  players: Map<diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power>> | null
  result: Set<diplomacy.rule.OrderResult<diplomacy.standardMap.Power, diplomacy.standardRule.MilitaryBranch, diplomacy.standardRule.Result>>
}

class Sandbox extends React.Component<{}, State> {
  constructor (props: {}) {
    super(props)
    this.state = { game: null, players: null, result: new Set() }
  }

  render () {
    const main = (this.state.game && this.state.players)
      ? [
        <HumanPlayerView key="map" board={this.state.game.board}/>,
        <div key="info" className="row">
          <div className="col-md-8">
            <ResultPanel result={this.state.result} />
          </div>
          <div className="col-md-4">
            <PlayerPanel
              ref={(playerPanel) => this.playerPanel = playerPanel}
              on={() => {this.menuView.enableResolve()}}
              game={this.state.game}
              players={this.state.players}/>
          </div>
        </div>
      ]
      : [<div key="none" />]

    return <div className="container">
      <MenuView
        ref={(menu) => this.menuView = menu}
        onResolve={() => {
          // Get orders for ai players
          this.menuView.disableResolve()

          if (this.playerPanel && this.playerPanel.orders) {
            this.playerPanel.orders.then(orders => {
              const os = orders
              if (this.state.game) {
                const result = diplomacy.standard.variant.rule.resolve(this.state.game.board, os)
                if (result.err) {
                  // TODO error-dialog
                  return
                }
                if (result.result) {
                  // TODO Result-view
                  const x = this.state.game.pastStates
                  x.push({
                    board: this.state.game.board, orders: os
                  })
                  this.setState({
                    game: new Game(x, result.result.board),
                    players: this.state.players,
                    result: result.result.results
                  })
                }
              }
            })
          }
        }}
        onStartNewGame={() => { this.playerDialog.open() }}/>
      {main}

      <PlayerDialog
        ref={(playerDialog) => {this.playerDialog = playerDialog}}
        candidates={players}
        onSelected={(players) => {
          const aiPlayers = Array.from(players)
            .filter(elem => elem[1] != null) as Array<[diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power>]>
          this.setState({
            game: new Game([], diplomacy.standard.variant.initialBoard),
            players: new Map(aiPlayers)
          })
        }}
        />
      <div className="modal fade error">
        <div className="modal-dialog">
          <div className="modal-content"></div>
        </div>
      </div>
    </div>
  }
  private menuView: MenuView
  private playerDialog: PlayerDialog
  private playerPanel: PlayerPanel | null
}

function initialize () {
  ReactDom.render(<Sandbox />, document.getElementById("sandbox"))
}

(window as any).initialize = initialize

/*
import { MenuView } from "./frontend/menu-view"
import { PlayerSelectorView } from "./frontend/player-selector-view"
import { RandomPlayer } from "./player/random-player"

class X extends PlayerSelectorView<diplomacy.standardMap.Power> {}

class X2 extends React.Component<{}, {}> { render() { return <div>Foo</div>}}

export function initializeReact () {
  ReactDom.render(
    <MenuView X={X2} ref={(x) => (window as any).menuView = x } onResolve={() => {}} onStartNewGame={() => {}}/>,
    document.getElementById('menu')
  )

  const availablePlayers =
    new Map([["random", (power: diplomacy.standardMap.Power) => new RandomPlayer({
      simulatedAnnealingIteration: 1000,
      alpha: 0.9,
      optimizeIteration: 10
    }, power)]])

  ReactDom.render(
    <X
      ref={x => (window as any).configView = x}
      stringify={(power: diplomacy.standardMap.Power) => diplomacy.standardMap.Power[power]}
      powers={new Set<diplomacy.standardMap.Power>([
        diplomacy.standardMap.Power.England, diplomacy.standardMap.Power.Austria,
        diplomacy.standardMap.Power.France, diplomacy.standardMap.Power.Germany,
        diplomacy.standardMap.Power.Italy, diplomacy.standardMap.Power.Russia,
        diplomacy.standardMap.Power.Turkey
      ])}
      availablePlayers={new Set("random")}
      onSelected={(item) => console.log(item)}
      />,
    document.getElementById('config')
  )
}
*/
