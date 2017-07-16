import * as diplomacy from "js-diplomacy"
import { Game } from "./game"
import { RandomPlayer } from "./player/random-player"
import { DefensivePlayer } from "./player/defensive-player"
import { RuleBasedPlayer } from "./player/rule-based-player"

declare type Power = diplomacy.standardMap.Power
declare type Board = diplomacy.standardRule.Board<Power>
declare type Order = diplomacy.standardRule.Order.Order<Power>

const powers = [
  diplomacy.standardMap.Power.Austria, diplomacy.standardMap.Power.England,
  diplomacy.standardMap.Power.France, diplomacy.standardMap.Power.Germany,
  diplomacy.standardMap.Power.Italy, diplomacy.standardMap.Power.Russia,
  diplomacy.standardMap.Power.Turkey
]

const configs = {
  importanceIteration: 3,
  map: diplomacy.standard.variant.initialBoard.map
}

const players = new Set()
for (let i = 0; i < 7; i++) {
  const p = powers[i]
  const player = new RuleBasedPlayer(configs, p)
  players.add(player)
}

let game = new Game<Power>([], diplomacy.standard.variant.initialBoard)

function mkOrders () {
  let os: Array<Order> = []
  players.forEach(p => {
    os = os.concat(Array.from(p.nextOrders(game)) as Array<Order>)
  })
  return new Set(os)
}

function resolve () {
  try {
    const orders = mkOrders()
    const result = diplomacy.standard.variant.rule.resolve(game.board, orders)

    if (result.result) {
      const t = game.board.state.turn as any
      console.log(`Resolve ${t.year}-${diplomacy.standardBoard.Season[t.season as diplomacy.standardBoard.Season]} (${diplomacy.standardRule.Phase[game.board.state.phase]})`)
      orders.forEach(order => {
        console.log(`  ${order}`)
      })
      console.log()
      const ps = game.pastStates
      ps.push({
        board: game.board,
        orders: orders
      })
      game = new Game(ps, result.result.board)

      if (result.result.isFinished) {
        console.log("Game is finished")
      } else {
        resolve()
      }
    }
    if (result.err) {
      console.error(result.err)
    }
  } catch (e) {
    console.error(e)
  }
}

resolve()
