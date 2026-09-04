const customers = [
  'Fiona Nguyen', 'Marco Lee', 'Faye Carter', 'Maya Singh', 'Mina Moore',
  'Felix Hall', 'Cam Rivera', 'Ari Novak', 'Zoë Martín', '李明',
  'Sofía O’Connor', 'Renée Dubois', 'Fiona Nguyen',
];
const cities = ['Chicago', 'Lisbon', 'London', 'Berlin', 'New York', 'Toronto', 'São Paulo', 'Łódź'];
const countries = ['US', 'PT', 'GB', 'DE', 'CA', 'BR', 'PL'];
const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'BRL', 'PLN'];
const memberships = ['Gold', 'Silver', 'Bronze'];
const statuses = ['Processing', 'Shipped', 'Pending Review', 'Delivered', 'Payment Hold'];
const categories = ['Electronics', 'Home', 'Apparel', 'Beauty', 'Sports', 'Books'];
const products = ['Studio Headphones', 'Café Press', 'Trail Shoes', '照明 Kit', 'Crème Set', 'Smart Watch'];
const tagPool = ['priority', 'repeat', 'gift', 'mobile', 'wholesale', 'review'];

const DAY_MS = 86_400_000;
const START_AT = Date.UTC(2024, 0, 1, 8, 0, 0);

function initials(name: string) {
  return name.split(/\s+/u).map(part => part[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export const ECOMMERCE_DATA = Array.from({ length: 1000 }, (_, index) => {
  const customer = customers[index % customers.length];
  const category = categories[(index * 5) % categories.length];
  const orderAt = START_AT + ((index * 17) % 730) * DAY_MS;
  const baseSpend = 45 + ((index * 347) % 5400);
  const totalSpend = index === 0 ? 0 : index === 1 ? -45 : baseSpend;
  const rating = index % 37 === 0 ? null : index % 101 === 0 ? 0 : index % 97 === 0 ? 5 : 2.5 + ((index * 3) % 26) / 10;
  const city = index % 43 === 0 ? null : cities[index % cities.length];
  const discount = index % 29 === 0 ? null : index % 3 !== 0;
  const spendChange = index % 89 === 0 ? 0 : ((index % 21) - 10) / 100;

  return {
    'Customer ID': `CUS-${String(index + 1).padStart(4, '0')}`,
    Customer: customer,
    avatar: initials(customer),
    Gender: index % 2 ? 'Male' : 'Female',
    Age: index === 2 ? 18 : index === 3 ? 100 : 18 + ((index * 7) % 63),
    City: city,
    Country: countries[index % countries.length],
    Currency: currencies[index % currencies.length],
    'Membership Type': memberships[index % memberships.length],
    'Lifetime Value': index === 0 ? 0 : Math.round(baseSpend * (2 + (index % 4))),
    'Average Rating': rating,
    'Discount Applied': discount,
    'Spend Change (%)': spendChange,
    'Total Spend': totalSpend,
    'Order ID': `ORD-${String(100_000 + index)}`,
    'Order Date': new Date(orderAt).toISOString().slice(0, 10),
    'Created At': new Date(orderAt + (index % 24) * 3_600_000).toISOString(),
    'Order Status': statuses[index % statuses.length],
    'Product Category': category,
    SKU: index % 67 === 0
      ? ''
      : `${countries[index % countries.length]}-${category.slice(0, 2).toUpperCase()}-${String(500 + (index % 137)).padStart(3, '0')}`,
    Product: products[index % products.length],
    Tags: index % 53 === 0
      ? []
      : [tagPool[index % tagPool.length], ...(index % 4 === 0 ? [tagPool[(index + 2) % tagPool.length]] : [])],
  };
});
