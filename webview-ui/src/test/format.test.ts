import { describe, it, expect } from "vitest"
import { formatLargeNumber } from "../utils/format"

describe("formatLargeNumber", () => {
    it("should format billions correctly", () => {
        expect(formatLargeNumber(1000000000)).toBe("1.0b")
        expect(formatLargeNumber(2500000000)).toBe("2.5b")
        expect(formatLargeNumber(9900000000)).toBe("9.9b")
    })

    it("should format millions correctly", () => {
        expect(formatLargeNumber(1000000)).toBe("1.0m")
        expect(formatLargeNumber(2500000)).toBe("2.5m")
        expect(formatLargeNumber(9900000)).toBe("9.9m")
    })

    it("should format thousands correctly", () => {
        expect(formatLargeNumber(1000)).toBe("1.0k")
        expect(formatLargeNumber(2500)).toBe("2.5k")
        expect(formatLargeNumber(9900)).toBe("9.9k")
    })

    it("should return numbers less than 1000 as strings", () => {
        expect(formatLargeNumber(0)).toBe("0")
        expect(formatLargeNumber(100)).toBe("100")
        expect(formatLargeNumber(999)).toBe("999")
    })

    it("should handle edge cases", () => {
        expect(formatLargeNumber(999999)).toBe("1.0m")
        expect(formatLargeNumber(999999999)).toBe("1.0b")
        expect(formatLargeNumber(1)).toBe("1")
    })
})
