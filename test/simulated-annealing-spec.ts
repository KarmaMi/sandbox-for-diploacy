import * as chai from "chai"
import { SimulatedAnnealing } from "./../src/optimizer"

const should = chai.should()

describe("A simulated-annealing", () => {
  it("optimize using ojective function", () => {
    const optimizer = new SimulatedAnnealing({
      iteration: 200,
      alpha: 0.9,
      initialTemprature: 1000,
      randomNeighbor: (target: number) => (Math.random() < 0.5) ? target - 1 : target + 1,
      evaluate: (target: number) => {
        return Math.pow(target, 4) + 4 * Math.pow(target, 3) + 3 * Math.pow(target, 2)
      }
    })


    let values = []
    for (let i = 0; i < 100; i++) {
      values.push(optimizer.optimize(0))
    }

    values.should.include(-2)
  })
  it("call the callback function during iteration", () => {
    let iterNum = null

    const optimizer = new SimulatedAnnealing(
      {
        iteration: 200,
        alpha: 0.9,
        initialTemprature: 1000,
        randomNeighbor: (target: number) => (Math.random() < 0.5) ? target - 1 : target + 1,
        evaluate: (target: number) => {
          return Math.pow(target, 4) + 4 * Math.pow(target, 3) + 3 * Math.pow(target, 2)
        }
      }
    )

    optimizer.optimize(0, (progress: number) => { iterNum = progress * 200 })
    should.equal(iterNum, 199)
  })
})
