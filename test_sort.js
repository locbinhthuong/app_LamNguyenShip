const arr = [
  { id: 1, updatedAt: '2024-01-01' },
  { id: 2 }, // no updatedAt
  { id: 3, updatedAt: '2024-01-02' }
];

const sorted = arr.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
console.log('Sorted length:', sorted.length);
console.log('Sorted:', sorted);
