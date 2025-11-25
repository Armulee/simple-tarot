const { BirthChartGenerator } = require("vedic-astrology-api/lib/utils/birthchart");
const { calculatePlanetaryPositions, calculateAscendant, createDate } = require("vedic-astrology-api/lib/utils/common");

// Mock inputs
const date = createDate(1990, 1, 1, 12, 0, 0);
const lat = 40.7128;
const lng = -74.0060;

const { positions } = calculatePlanetaryPositions(date, lat, lng);
const ascendant = calculateAscendant(date, lat, lng);

const generator = new BirthChartGenerator();
const chart = generator.generateBirthChart(positions, ascendant);

console.log("Planets Structure:", JSON.stringify(chart.planets, null, 2));
console.log("Houses Structure:", JSON.stringify(chart.houses, null, 2));
