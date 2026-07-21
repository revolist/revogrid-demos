const cities = ['Chicago', 'Lisbon', 'London', 'Berlin', 'New York', 'Toronto'];
const memberships = ['Gold', 'Silver', 'Bronze'];

export const ECOMMERCE_DATA = Array.from({ length: 48 }, (_, index) => {
  const spend = 420 + ((index * 347) % 5400);
  return {
    'Customer ID': `CUS-${String(index + 1).padStart(4, '0')}`,
    Gender: index % 2 ? 'Female' : 'Male',
    Age: 22 + ((index * 7) % 39),
    City: cities[index % cities.length],
    'Membership Type': memberships[index % memberships.length],
    'Lifetime Value': spend * (2 + (index % 4)),
    'Average Rating': 3 + ((index * 3) % 20) / 10,
    'Discount Applied': index % 3 !== 0,
    'Spend Change (%)': ((index % 9) - 4) / 100,
    'Total Spend': spend,
  };
});
