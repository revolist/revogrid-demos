import type { ColumnData } from '@revolist/revogrid';
import { columnTypeRenderer } from '@revolist/revogrid-pro';

export type ContactRow = {
  firstName: string;
  lastName: string;
  age: number;
  street: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  mobile: string;
};

const CONTACTS: ContactRow[] = [
  { firstName: 'John', lastName: 'Doe', age: 30, street: '123 Main St', city: 'New York', country: 'USA', email: 'john@example.com', phone: '123-456-7890', mobile: '098-765-4321' },
  { firstName: 'Jane', lastName: 'Smith', age: 28, street: '456 Oak Ave', city: 'São Paulo', country: 'Brazil', email: 'jane@example.com', phone: '234-567-8901', mobile: '987-654-3210' },
  { firstName: 'Bob', lastName: 'Johnson', age: 35, street: '789 Pine Rd', city: 'Madrid', country: 'Spain', email: 'bob@example.com', phone: '345-678-9012', mobile: '876-543-2109' },
  { firstName: 'Aisha', lastName: 'Khan', age: 32, street: '22 Garden Walk', city: 'London', country: 'UK', email: 'aisha@example.com', phone: '456-789-0123', mobile: '765-432-1098' },
  { firstName: 'Kenji', lastName: 'Sato', age: 41, street: '8 Sakura Lane', city: 'Tokyo', country: 'Japan', email: 'kenji@example.com', phone: '567-890-1234', mobile: '654-321-0987' },
  { firstName: 'Amélie', lastName: 'Martin', age: 26, street: '14 Rue Victor', city: 'Paris', country: 'France', email: 'amelie@example.com', phone: '678-901-2345', mobile: '543-210-9876' },
  { firstName: 'Mateo', lastName: 'García', age: 38, street: '51 Calle Mayor', city: 'Valencia', country: 'Spain', email: 'mateo@example.com', phone: '789-012-3456', mobile: '432-109-8765' },
  { firstName: 'Nora', lastName: 'Hansen', age: 29, street: '7 Havnegade', city: 'Copenhagen', country: 'Denmark', email: 'nora@example.com', phone: '890-123-4567', mobile: '321-098-7654' },
  { firstName: 'Liam', lastName: 'Murphy', age: 44, street: '19 River Quay', city: 'Dublin', country: 'Ireland', email: 'liam@example.com', phone: '901-234-5678', mobile: '210-987-6543' },
  { firstName: 'Sofia', lastName: 'Rossi', age: 33, street: '31 Via Verde', city: 'Milan', country: 'Italy', email: 'sofia@example.com', phone: '012-345-6789', mobile: '109-876-5432' },
  { firstName: 'Noah', lastName: 'Wilson', age: 37, street: '82 Queen St', city: 'Toronto', country: 'Canada', email: 'noah@example.com', phone: '112-345-6789', mobile: '209-876-5432' },
  { firstName: 'Maya', lastName: 'Patel', age: 31, street: '6 Lake View', city: 'Mumbai', country: 'India', email: 'maya@example.com', phone: '212-345-6789', mobile: '309-876-5432' },
];

export function createColumnCollapseRows(): ContactRow[] {
  return CONTACTS.map(row => ({ ...row }));
}

export function createColumnCollapseColumns(): ColumnData {
  return [
    {
      name: 'Personal Information',
      collapsible: true,
      collapsed: true,
      columnTemplate: columnTypeRenderer,
      children: [
        {
          prop: 'age',
          name: 'Age',
          size: 125,
          sealed: true,
          rowSelect: true,
          filterPlaceholder: 'Age?',
          pin: 'colPinStart',
        },
        { prop: 'firstName', name: 'First Name', size: 155, pin: 'colPinStart' },
        { prop: 'lastName', name: 'Last Name', size: 145, pin: 'colPinStart' },
      ],
    },
    {
      name: 'Address',
      collapsible: true,
      columnType: 'id',
      columnTemplate: columnTypeRenderer,
      children: [
        { prop: 'street', name: 'Street', size: 185, sealed: true, filterPlaceholder: 'Where?' },
        { prop: 'city', name: 'City', size: 145, filterPlaceholder: 'Where?' },
        { prop: 'country', name: 'Country', size: 135, filterPlaceholder: 'Where?' },
      ],
    },
    {
      name: 'Contact',
      collapsible: true,
      collapsed: true,
      columnType: 'integer',
      columnTemplate: columnTypeRenderer,
      children: [
        { prop: 'email', name: 'Email', size: 220, sealed: true },
        { prop: 'phone', name: 'Phone', size: 150 },
        { prop: 'mobile', name: 'Mobile', size: 150 },
      ],
    },
  ];
}
