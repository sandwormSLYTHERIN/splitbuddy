/**
 * BalanceEngine — The brain behind SplitBuddy's settlements
 *
 * Computes who owes whom using a greedy minimal-transaction algorithm.
 * Handles rounding consistently to avoid penny discrepancies.
 */

/**
 * Round to 2 decimal places consistently
 */
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate net balances for all participants in a group
 * @param {Array} expenses - Array of expense documents
 * @returns {Object} netBalances - { participantName: netAmount }
 *   Positive = is owed money, Negative = owes money
 */
function calculateNetBalances(expenses) {
  const balances = {};

  for (const expense of expenses) {
    // Payer paid the full amount — they are owed
    if (!balances[expense.payer]) balances[expense.payer] = 0;
    balances[expense.payer] = round2(balances[expense.payer] + expense.amount);

    // Each participant owes their split amount
    for (const split of expense.splits) {
      if (!balances[split.participant]) balances[split.participant] = 0;
      balances[split.participant] = round2(balances[split.participant] - split.amount);
    }
  }

  return balances;
}

/**
 * Generate a directional balance matrix
 * Shows exactly how much each person owes every other person
 * @param {Array} expenses
 * @returns {Object} matrix - { "A->B": amount }
 */
function calculateDirectionalBalances(expenses) {
  const owes = {}; // owes["A->B"] = how much A owes B

  for (const expense of expenses) {
    const payer = expense.payer;
    for (const split of expense.splits) {
      if (split.participant === payer) continue; // Skip self
      const key = `${split.participant}->${payer}`;
      if (!owes[key]) owes[key] = 0;
      owes[key] = round2(owes[key] + split.amount);
    }
  }

  // Net out bidirectional debts
  const netted = {};
  const processed = new Set();

  for (const key of Object.keys(owes)) {
    if (processed.has(key)) continue;
    const [from, to] = key.split('->');
    const reverseKey = `${to}->${from}`;
    const forward = owes[key] || 0;
    const backward = owes[reverseKey] || 0;
    const net = round2(forward - backward);

    if (net > 0) {
      netted[key] = net;
    } else if (net < 0) {
      netted[reverseKey] = round2(-net);
    }

    processed.add(key);
    processed.add(reverseKey);
  }

  return netted;
}

/**
 * Compute minimal settlement transactions using a greedy algorithm
 * Minimizes the number of transactions needed to settle all debts
 *
 * Algorithm:
 * 1. Compute net balance for each participant
 * 2. Separate into creditors (positive) and debtors (negative)
 * 3. Sort both by absolute amount descending
 * 4. Match largest debtor with largest creditor
 * 5. Settle the minimum of both amounts
 * 6. Repeat until all settled
 *
 * @param {Array} expenses
 * @returns {Array} settlements - [{ from, to, amount }]
 */
function computeSettlements(expenses) {
  if (!expenses || expenses.length === 0) return [];

  const netBalances = calculateNetBalances(expenses);
  const settlements = [];

  // Split into creditors and debtors
  let creditors = []; // People who are owed money (positive balance)
  let debtors = [];   // People who owe money (negative balance)

  for (const [person, balance] of Object.entries(netBalances)) {
    if (balance > 0.01) {
      creditors.push({ person, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ person, amount: -balance }); // Store as positive for easier math
    }
  }

  // Sort descending by amount for optimal matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Greedy matching
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = round2(Math.min(debtor.amount, creditor.amount));

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: settleAmount,
      });
    }

    debtor.amount = round2(debtor.amount - settleAmount);
    creditor.amount = round2(creditor.amount - settleAmount);

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return settlements;
}

/**
 * Get per-participant spending stats
 * @param {Array} expenses
 * @returns {Array} stats - [{ name, totalPaid, totalOwed, netBalance, expenseCount, percentage }]
 */
function getParticipantStats(expenses) {
  if (!expenses || expenses.length === 0) return [];

  const stats = {};
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  for (const expense of expenses) {
    // Track what each person paid
    if (!stats[expense.payer]) {
      stats[expense.payer] = { totalPaid: 0, totalOwed: 0, expenseCount: 0 };
    }
    stats[expense.payer].totalPaid = round2(stats[expense.payer].totalPaid + expense.amount);
    stats[expense.payer].expenseCount++;

    // Track what each person owes
    for (const split of expense.splits) {
      if (!stats[split.participant]) {
        stats[split.participant] = { totalPaid: 0, totalOwed: 0, expenseCount: 0 };
      }
      stats[split.participant].totalOwed = round2(stats[split.participant].totalOwed + split.amount);
    }
  }

  return Object.entries(stats).map(([name, data]) => ({
    name,
    totalPaid: data.totalPaid,
    totalOwed: data.totalOwed,
    netBalance: round2(data.totalPaid - data.totalOwed),
    expenseCount: data.expenseCount,
    percentage: grandTotal > 0 ? round2((data.totalPaid / grandTotal) * 100) : 0,
  }));
}

/**
 * Generate fun insights about spending patterns
 * @param {Array} expenses
 * @param {Array} participants
 * @returns {Array} insights - [{ icon, text, type }]
 */
function generateInsights(expenses, participants) {
  if (!expenses || expenses.length === 0) return [];

  const insights = [];
  const stats = getParticipantStats(expenses);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Biggest spender
  const biggestSpender = stats.reduce((max, s) => s.totalPaid > max.totalPaid ? s : max, stats[0]);
  if (biggestSpender) {
    insights.push({
      icon: '👑',
      text: `${biggestSpender.name} is the group's biggest spender, paying ${biggestSpender.percentage}% of all expenses!`,
      type: 'fun',
    });
  }

  // Most frequent payer
  const mostFrequent = stats.reduce((max, s) => s.expenseCount > max.expenseCount ? s : max, stats[0]);
  if (mostFrequent && mostFrequent.expenseCount > 1) {
    insights.push({
      icon: '🏧',
      text: `${mostFrequent.name} reaches for their wallet the most — ${mostFrequent.expenseCount} times!`,
      type: 'fun',
    });
  }

  // Category breakdown
  const categories = {};
  for (const exp of expenses) {
    const cat = exp.categoryEmoji + ' ' + exp.category;
    if (!categories[cat]) categories[cat] = 0;
    categories[cat] = round2(categories[cat] + exp.amount);
  }
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push({
      icon: '📊',
      text: `Top spending category: ${topCategory[0]} at ₹${topCategory[1].toLocaleString()}`,
      type: 'stat',
    });
  }

  // Average expense
  const avgExpense = round2(totalSpent / expenses.length);
  insights.push({
    icon: '📈',
    text: `Average expense: ₹${avgExpense.toLocaleString()}. Total: ₹${totalSpent.toLocaleString()} across ${expenses.length} expenses.`,
    type: 'stat',
  });

  // Weekend vs weekday spending
  let weekendSpend = 0, weekdaySpend = 0;
  for (const exp of expenses) {
    const day = new Date(exp.date).getDay();
    if (day === 0 || day === 6) weekendSpend += exp.amount;
    else weekdaySpend += exp.amount;
  }
  if (weekendSpend > weekdaySpend) {
    insights.push({
      icon: '🎉',
      text: `Weekend warriors! You spend ${round2((weekendSpend / totalSpent) * 100)}% of your budget on weekends.`,
      type: 'fun',
    });
  }

  return insights;
}

module.exports = {
  calculateNetBalances,
  calculateDirectionalBalances,
  computeSettlements,
  getParticipantStats,
  generateInsights,
  round2,
};
