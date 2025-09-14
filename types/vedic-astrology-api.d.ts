declare module "vedic-astrology-api" {
    // Provide minimal typings to satisfy the compiler for current usage
    export class BirthChartGenerator {
        generateBirthChart(
            positions: Record<
                string,
                { longitude: number; [key: string]: unknown }
            >,
            ascendant: number
        ): { houses: unknown; planets: unknown }
    }

    export function createDate(
        year: number | string,
        month: number | string,
        day: number | string,
        hour: number | string,
        minute: number | string,
        timezone: number | string
    ): Date

    export function calculatePlanetaryPositions(
        date: Date,
        latitude: number | string,
        longitude: number | string
    ): {
        positions: Record<string, { longitude: number; [key: string]: unknown }>
        ayanamsa: number
    }

    export function calculateAscendant(
        date: Date,
        latitude: number | string,
        longitude: number | string
    ): number
}

declare module "vedic-astrology-api/lib/utils/common" {
    export function createDate(
        year: number | string,
        month: number | string,
        day: number | string,
        hour: number | string,
        minute: number | string,
        timezone: number | string
    ): Date

    export function calculatePlanetaryPositions(
        date: Date,
        latitude: number | string,
        longitude: number | string
    ): {
        positions: Record<string, { longitude: number; [key: string]: unknown }>
        ayanamsa: number
    }

    export function calculateAscendant(
        date: Date,
        latitude: number | string,
        longitude: number | string
    ): number
}

declare module "vedic-astrology-api/lib/utils/birthchart" {
    export class BirthChartGenerator {
        generateBirthChart(
            positions: Record<
                string,
                { longitude: number; [key: string]: unknown }
            >,
            ascendant: number
        ): { houses: unknown; planets: unknown }
    }
}

// Fallback wildcard to silence unresolved subpaths if used
declare module "vedic-astrology-api/*"
