import * as diplomacy from "js-diplomacy"

export default function provinceImportance<Power>(
  iteration: number,
  map: diplomacy.standardRule.DiplomacyMap<Power>
): Map<diplomacy.board.Province<Power>, number> {
  if (iteration === 0) {
    return new Map(Array.from(map.provinces).map(province => {
      return <[diplomacy.board.Province<Power>, number]>[province, province.isSupplyCenter ? 1 : 0]
    }))
  } else {
    const prev = provinceImportance(iteration - 1, map)

    return new Map(
      Array.from(map.provinces).map(province => {
        const neighbors1 = map.movableProvincesOf(province, diplomacy.standardRule.MilitaryBranch.Army)
        const neighbors2 = map.movableProvincesOf(province, diplomacy.standardRule.MilitaryBranch.Fleet)

        const neighbors = new Set(Array.from(neighbors1).concat(Array.from(neighbors2)))

        const n = Array.from(neighbors).reduce(
          (sum, province) => sum + (prev.get(province) || 0),
          prev.get(province) || 0
        )

        return <[diplomacy.board.Province<Power>, number]>([province, n])
      })
    )
  }
}
