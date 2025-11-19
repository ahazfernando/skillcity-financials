# Algorithms & Data Structures Analysis for FinFlow Central

## Current Implementation Analysis

### Current Data Structures
1. **Arrays** - Used for storing invoices, payrolls, employees, sites, schedules, reminders
2. **Objects/Maps** - TypeScript interfaces for structured data
3. **No Indexing** - Linear search through arrays for all operations

### Current Algorithms & Performance Issues

#### 1. **Dashboard Aggregations** (O(n) multiple times)
```typescript
// Current: Multiple O(n) operations
const totalRevenue = mockInvoices
  .filter(inv => inv.status === "received")  // O(n)
  .reduce((sum, inv) => sum + inv.totalAmount, 0);  // O(n)

const pendingRevenue = mockInvoices
  .filter(inv => inv.status === "pending")  // O(n) - repeated filtering
  .reduce((sum, inv) => sum + inv.totalAmount, 0);  // O(n)
```

**Problem**: Each calculation iterates through the entire array separately.

#### 2. **Status Counting** (O(n) per status)
```typescript
// Current: O(n) for each status check
{ status: "received", count: mockInvoices.filter(i => i.status === "received").length }
{ status: "pending", count: mockInvoices.filter(i => i.status === "pending").length }
{ status: "overdue", count: mockInvoices.filter(i => i.status === "overdue").length }
```

**Problem**: Three separate O(n) operations instead of one.

#### 3. **Search & Filter** (O(n) linear search)
```typescript
// Current: O(n) linear search
const filteredInvoices = mockInvoices.filter(invoice => {
  const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
    invoice.clientName.toLowerCase().includes(searchValue.toLowerCase());
  return matchesSearch && matchesStatus;
});
```

**Problem**: No indexing, requires full array scan for every search.

---

## Recommended Data Structures & Algorithms

### 1. **Hash Maps / Indexed Lookups** (O(1) lookups)

#### **Status Index Map**
```typescript
// Create index once: O(n)
const invoicesByStatus = {
  received: mockInvoices.filter(i => i.status === "received"),
  pending: mockInvoices.filter(i => i.status === "pending"),
  overdue: mockInvoices.filter(i => i.status === "overdue")
};

// Then use: O(1) lookup
const totalRevenue = invoicesByStatus.received
  .reduce((sum, inv) => sum + inv.totalAmount, 0);
```

#### **ID-based Hash Map**
```typescript
// O(n) to build, O(1) to lookup
const invoiceMap = new Map<string, Invoice>();
mockInvoices.forEach(inv => invoiceMap.set(inv.id, inv));

// Fast lookup by ID
const invoice = invoiceMap.get("inv-001"); // O(1)
```

### 2. **Single-Pass Aggregation** (O(n) single iteration)

#### **Optimized Dashboard Calculations**
```typescript
// Single pass: O(n) instead of multiple O(n) operations
const financialMetrics = mockInvoices.reduce((acc, inv) => {
  if (inv.status === "received") {
    acc.totalRevenue += inv.totalAmount;
    acc.receivedCount++;
  } else if (inv.status === "pending") {
    acc.pendingRevenue += inv.totalAmount;
    acc.pendingCount++;
  } else if (inv.status === "overdue") {
    acc.overdueCount++;
  }
  return acc;
}, {
  totalRevenue: 0,
  pendingRevenue: 0,
  receivedCount: 0,
  pendingCount: 0,
  overdueCount: 0
});
```

### 3. **Trie Data Structure** (O(m) search, where m = search term length)

#### **For Fast Text Search**
```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  ids: Set<string>; // Invoice IDs that match this prefix
  
  constructor() {
    this.children = new Map();
    this.ids = new Set();
  }
}

class InvoiceSearchTrie {
  private root: TrieNode;
  
  // Build: O(n * m) where n = invoices, m = avg string length
  buildTrie(invoices: Invoice[]) {
    this.root = new TrieNode();
    invoices.forEach(inv => {
      this.insert(inv.invoiceNumber.toLowerCase(), inv.id);
      this.insert(inv.clientName.toLowerCase(), inv.id);
    });
  }
  
  // Search: O(m) where m = search term length
  search(prefix: string): string[] {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    return Array.from(node.ids);
  }
}
```

### 4. **Binary Search Tree / Sorted Arrays** (O(log n) search)

#### **For Date Range Queries**
```typescript
// Sort by date once: O(n log n)
const sortedInvoices = [...mockInvoices].sort((a, b) => 
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
);

// Binary search for date range: O(log n)
function findInvoicesInDateRange(start: Date, end: Date): Invoice[] {
  // Use binary search to find start and end indices
  // Then slice: O(k) where k = results
}
```

### 5. **Memoization / Caching** (Avoid redundant calculations)

#### **React useMemo for Expensive Calculations**
```typescript
const financialMetrics = useMemo(() => {
  return mockInvoices.reduce((acc, inv) => {
    // ... aggregation logic
  }, initialValue);
}, [mockInvoices]); // Only recalculate when data changes
```

### 6. **Grouping Algorithms** (O(n) single pass)

#### **Group by Multiple Criteria**
```typescript
// Group invoices by status AND month: O(n)
const invoicesByStatusAndMonth = mockInvoices.reduce((acc, inv) => {
  const month = new Date(inv.issueDate).toLocaleString('default', { month: 'short' });
  const key = `${inv.status}-${month}`;
  
  if (!acc[key]) {
    acc[key] = { status: inv.status, month, invoices: [], total: 0 };
  }
  acc[key].invoices.push(inv);
  acc[key].total += inv.totalAmount;
  return acc;
}, {} as Record<string, { status: string; month: string; invoices: Invoice[]; total: number }>);
```

### 7. **Priority Queue / Heap** (O(log n) insert, O(1) peek max)

#### **For Reminders by Priority**
```typescript
class PriorityQueue {
  private heap: Reminder[];
  
  // Insert: O(log n)
  enqueue(reminder: Reminder) {
    this.heap.push(reminder);
    this.bubbleUp(this.heap.length - 1);
  }
  
  // Get highest priority: O(1)
  peek(): Reminder | null {
    return this.heap[0] || null;
  }
  
  // Remove highest priority: O(log n)
  dequeue(): Reminder | null {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    this.heap[0] = this.heap[this.heap.length - 1];
    this.heap.pop();
    this.bubbleDown(0);
    return max;
  }
}
```

### 8. **Graph Data Structure** (For Relationships)

#### **For Site-Employee Relationships**
```typescript
class SiteEmployeeGraph {
  private adjacencyList: Map<string, Set<string>>;
  
  // Build relationships: O(n)
  buildGraph(workSchedules: WorkSchedule[]) {
    workSchedules.forEach(ws => {
      if (!this.adjacencyList.has(ws.siteId)) {
        this.adjacencyList.set(ws.siteId, new Set());
      }
      this.adjacencyList.get(ws.siteId)!.add(ws.employeeId);
    });
  }
  
  // Find employees for site: O(1)
  getEmployeesForSite(siteId: string): string[] {
    return Array.from(this.adjacencyList.get(siteId) || []);
  }
  
  // Find sites for employee: O(n) - could optimize with reverse index
  getSitesForEmployee(employeeId: string): string[] {
    const sites: string[] = [];
    this.adjacencyList.forEach((employees, siteId) => {
      if (employees.has(employeeId)) {
        sites.push(siteId);
      }
    });
    return sites;
  }
}
```

### 9. **Time-Series Data Structure** (For Monthly Aggregations)

#### **Efficient Monthly Aggregation**
```typescript
class TimeSeriesAggregator {
  private monthlyData: Map<string, { revenue: number; expenses: number }>;
  
  // Aggregate by month: O(n)
  aggregate(invoices: Invoice[], payrolls: Payroll[]) {
    this.monthlyData = new Map();
    
    invoices.forEach(inv => {
      const month = this.getMonthKey(inv.issueDate);
      const current = this.monthlyData.get(month) || { revenue: 0, expenses: 0 };
      current.revenue += inv.totalAmount;
      this.monthlyData.set(month, current);
    });
    
    payrolls.forEach(pay => {
      const month = this.getMonthKey(pay.period);
      const current = this.monthlyData.get(month) || { revenue: 0, expenses: 0 };
      current.expenses += pay.totalAmount;
      this.monthlyData.set(month, current);
    });
  }
  
  // Get month data: O(1)
  getMonth(monthKey: string) {
    return this.monthlyData.get(monthKey);
  }
  
  private getMonthKey(date: string): string {
    return new Date(date).toISOString().slice(0, 7); // "2025-01"
  }
}
```

### 10. **Sliding Window Algorithm** (For Trend Analysis)

#### **Calculate Moving Averages**
```typescript
function calculateMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = [];
  let windowSum = 0;
  
  // O(n) sliding window
  for (let i = 0; i < data.length; i++) {
    windowSum += data[i];
    if (i >= windowSize - 1) {
      result.push(windowSum / windowSize);
      windowSum -= data[i - windowSize + 1];
    }
  }
  return result;
}
```

---

## Implementation Priority Recommendations

### High Priority (Immediate Impact)
1. **Single-Pass Aggregation** - Replace multiple filter/reduce with one pass
2. **Memoization** - Cache expensive calculations with React useMemo
3. **Status Index Map** - Pre-compute status groupings

### Medium Priority (Better Scalability)
4. **ID-based Hash Maps** - Fast lookups by ID
5. **Date Sorted Arrays** - Efficient date range queries
6. **Time-Series Aggregator** - Monthly data pre-computation

### Low Priority (Advanced Features)
7. **Trie for Search** - Only if search becomes a bottleneck
8. **Priority Queue** - For complex reminder management
9. **Graph Structure** - For relationship queries

---

## Performance Comparison

| Operation | Current | Optimized | Improvement |
|-----------|---------|-----------|-------------|
| Dashboard calculations | O(6n) | O(n) | 6x faster |
| Status counting | O(3n) | O(n) | 3x faster |
| Search by text | O(n) | O(m) with Trie | Better for long lists |
| Lookup by ID | O(n) | O(1) | n times faster |
| Date range query | O(n) | O(log n + k) | Much better for large datasets |

---

## Example: Optimized Dashboard Implementation

```typescript
// Single-pass aggregation
const dashboardMetrics = useMemo(() => {
  const invoiceMetrics = mockInvoices.reduce((acc, inv) => {
    acc[inv.status].total += inv.totalAmount;
    acc[inv.status].count++;
    return acc;
  }, {
    received: { total: 0, count: 0 },
    pending: { total: 0, count: 0 },
    overdue: { total: 0, count: 0 }
  });
  
  const payrollMetrics = mockPayrolls.reduce((acc, pay) => {
    acc[pay.status].total += pay.totalAmount;
    acc[pay.status].count++;
    return acc;
  }, {
    received: { total: 0, count: 0 },
    pending: { total: 0, count: 0 }
  });
  
  return {
    totalRevenue: invoiceMetrics.received.total,
    pendingRevenue: invoiceMetrics.pending.total,
    totalExpenses: payrollMetrics.received.total,
    pendingExpenses: payrollMetrics.pending.total,
    profit: invoiceMetrics.received.total - payrollMetrics.received.total,
    statusCounts: {
      received: invoiceMetrics.received.count,
      pending: invoiceMetrics.pending.count,
      overdue: invoiceMetrics.overdue.count
    }
  };
}, [mockInvoices, mockPayrolls]);
```

This reduces from **O(6n)** to **O(2n)** (one pass for invoices, one for payrolls).







