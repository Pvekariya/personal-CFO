const transactions = [
  { id: 1, date: "2023-10-01", amount: "100" },
  { id: 2, date: "2023-10-01", amount: "200" },
  { id: 3, date: "2023-10-02", amount: "300" }
];

const grouped = transactions.reduce((acc, txn) => {
  const dateStr = txn.date.split("T")[0];
  if (!acc[dateStr]) acc[dateStr] = [];
  acc[dateStr].push(txn);
  return acc;
}, {});

console.log(grouped);
