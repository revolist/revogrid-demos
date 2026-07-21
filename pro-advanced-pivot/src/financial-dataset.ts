export interface FinancialRow {
  Country: string;
  Segment: string;
  Product: string;
  'Discount Band': string;
  Date: string;
  Year: number;
  Month: string;
  'Units Sold': number;
  'Gross Sales': number;
  Discounts: number;
  Sales: number;
  COGS: number;
  Profit: number;
}

const COUNTRIES = [
  ['Canada', 0.92],
  ['France', 0.88],
  ['Germany', 1.04],
  ['Mexico', 0.78],
  ['United States', 1.24],
] as const;

const SEGMENTS = [
  ['Enterprise', 1.2, 1.03],
  ['Government', 1.05, 0.98],
  ['Midmarket', 0.86, 1],
  ['Small Business', 0.68, 1.04],
] as const;

const PRODUCTS = [
  ['Apex Suite', 320, 198],
  ['Beacon Pro', 185, 104],
  ['Cobalt Cloud', 120, 62],
  ['Delta One', 75, 41],
  ['Evergreen', 245, 151],
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DISCOUNTS = [
  ['None', 0],
  ['Low', 0.03],
  ['Medium', 0.07],
  ['High', 0.12],
] as const;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

/**
 * Original, deterministic demo data inspired by a common financial-sales schema.
 * It intentionally does not contain or derive values from Microsoft's workbook.
 */
function createFinancialData(): FinancialRow[] {
  const rows: FinancialRow[] = [];

  [2023, 2024, 2025].forEach((year, yearIndex) => {
    MONTHS.forEach((month, monthIndex) => {
      COUNTRIES.forEach(([country, countryFactor], countryIndex) => {
        SEGMENTS.forEach(([segment, segmentFactor, costFactor], segmentIndex) => {
          PRODUCTS.forEach(([product, listPrice, unitCost], productIndex) => {
            const seed =
              yearIndex * 1301 +
              monthIndex * 211 +
              countryIndex * 47 +
              segmentIndex * 17 +
              productIndex * 7;
            const seasonalFactor = 1 + Math.sin(((monthIndex + 1) / 12) * Math.PI * 2) * 0.16;
            const trendFactor = 1 + yearIndex * 0.085;
            const demand = 220 + ((seed * 73 + 191) % 1280);
            const unitsSold = Math.max(
              40,
              Math.round(demand * countryFactor * segmentFactor * seasonalFactor * trendFactor),
            );
            const [discountBand, discountRate] = DISCOUNTS[(seed + countryIndex) % DISCOUNTS.length];
            const price = listPrice * (1 + yearIndex * 0.035);
            const grossSales = roundCurrency(unitsSold * price);
            const discounts = roundCurrency(grossSales * discountRate);
            const sales = roundCurrency(grossSales - discounts);
            const cogs = roundCurrency(unitsSold * unitCost * costFactor * (1 + yearIndex * 0.025));

            rows.push({
              Country: country,
              Segment: segment,
              Product: product,
              'Discount Band': discountBand,
              Date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-15`,
              Year: year,
              Month: month,
              'Units Sold': unitsSold,
              'Gross Sales': grossSales,
              Discounts: discounts,
              Sales: sales,
              COGS: cogs,
              Profit: roundCurrency(sales - cogs),
            });
          });
        });
      });
    });
  });

  return rows;
}

export const FINANCIAL_DATA = createFinancialData();
