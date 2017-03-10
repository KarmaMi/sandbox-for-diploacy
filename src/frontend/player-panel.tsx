import * as React from "react"
import * as diplomacy from "js-diplomacy"

import { PlayerProgress } from "./player-progress"
import { Game } from "../game"
import { PlayerBase } from "../player/player-base"

export interface Props {
  game: Game<diplomacy.standardMap.Power>
  players: Map<diplomacy.standardMap.Power, PlayerBase<diplomacy.standardMap.Power>>
  on: () => void
}

export class PlayerPanel extends React.Component<Props, {}> {
  constructor (props: Props) {
    super(props)
    this.progresses = new Map()
  }
  render () {
    const progresses = Array.from(this.props.players).map(elem => {
      const [power, player] = elem
      return <PlayerProgress
        key={diplomacy.standardMap.Power[power]}
        power={power}
        ref={(p) => this.progresses.set(power, p)}
        />
    })
    return <div>{progresses}</div>
  }
  componentWillReceiveProps() {
    this.progresses.forEach(elem => {
      elem.setProgress(0)
    })
  }
  componentWillUpdate () {
    this.orders = null
  }
  componentDidMount () {
    this.update()
  }
  componentDidUpdate () {
    this.update()
  }
  update () {
    // async procedure
    const ps = Array.from(this.props.players).map(elem => {
      const [power, player] = elem
      const view = this.progresses.get(power)
      if (!view) return player.nextOrdersAsync(this.props.game)

      return player.nextOrdersAsync(this.props.game, (progress) => {
        view.setProgress(progress)
      }).then(orders => {
        view.complete()
        return orders
      })
    })
    this.orders = Promise.all(ps).then(ps => {
      let orders: Array<diplomacy.standardRule.Order.Order<diplomacy.standardMap.Power>> = []
      ps.forEach(os => {
        orders = orders.concat(Array.from(os))
      })

      return new Set(orders)
    })
    this.orders.then(os => this.props.on())
  }
  orders: Promise<Set<diplomacy.standardRule.Order.Order<diplomacy.standardMap.Power>>> | null
  progresses: Map<diplomacy.standardMap.Power, PlayerProgress>
}
