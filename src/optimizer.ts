export interface Optimizer<Target> {
  optimize (initial: Target, callback?: (progress: number) => void): Target
}

export interface SimulatedAnnealingConfigs<Target> {
  iteration: number
  alpha: number
  initialTemprature: number
  randomNeighbor: (target: Target) => Target | null
  evaluate: (target: Target) => number
}

export class SimulatedAnnealing<Target> {
  constructor (
    private config: SimulatedAnnealingConfigs<Target>
  ) {}

  optimize (seed: Target, callback?: (progress: number) => void): Target {
    let state = seed
    let e = this.config.evaluate(state)
    let bestState = state
    let bestE = e
    let temprature = this.config.initialTemprature
    for (let i = 0; i < this.config.iteration; i++) {
      if (callback) {
        callback(i / this.config.iteration)
      }

      const nextState = this.config.randomNeighbor(state)
      if (nextState === null) {
        break
      }
      const nextE = this.config.evaluate(nextState)

      if (nextE < bestE) {
        bestE = nextE
        bestState = nextState
      }

      if (Math.random() <= this.probability(e, nextE, temprature)) {
        e = nextE
        state = nextState
      }
      temprature *= this.config.alpha
    }

    return bestState
  }

  private probability (e1: number, e2: number, temprature: number): number {
    if (e1 >= e2) {
      return 1
    } else {
      return Math.exp((e1 - e2) / temprature)
    }
  }
}
