import { addPayroll } from "../src/lib/firebase/payroll";
import { Payroll, CashFlowMode, CashFlowType, PaymentMethod, PaymentStatus } from "../src/types/financial";

// Data extracted from the images
const payrollData: Omit<Payroll, "id">[] = [
  // Row 1 - Inflow
  {
    month: "November",
    date: "10.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Anthony",
    siteOfWork: "Hoopla South Morang",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 900.00,
    gstAmount: 90.00,
    totalAmount: 990.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Fortnightly Invoice - (27.10.2025-07.11.2025) - Hoopla South Morang",
  },
  // Row 2 - Inflow
  {
    month: "November",
    date: "11.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Andy",
    siteOfWork: "Sweetheart Patisserie by Naama",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 140.00,
    gstAmount: 14.00,
    totalAmount: 154.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "16.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "received" as PaymentStatus,
    notes: "Weekly Invoice - (03.11.2025-11.11.2025) - Sweetheart by Naama",
  },
  // Row 3 - Inflow
  {
    month: "November",
    date: "11.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Ace",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 880.00,
    gstAmount: 88.00,
    totalAmount: 968.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "18.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "received" as PaymentStatus,
    notes: "Weekly Invoice - (01.11.2025-09.11.2025) - Kebab Kraze",
  },
  // Row 4 - Inflow
  {
    month: "November",
    date: "07.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Sam",
    siteOfWork: "Mister Margherita",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 150.00,
    gstAmount: 15.00,
    totalAmount: 165.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Service Provided on the 07th of November Friday",
  },
  // Row 5 - Inflow (Paid)
  {
    month: "November",
    date: "17.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Dinitha Perera",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 870.00,
    gstAmount: 87.00,
    totalAmount: 957.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "23.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "paid" as PaymentStatus,
    notes: "Payment invoice for period (10.11.2025-16.11.2025)",
  },
  // Row 6 - Inflow
  {
    month: "November",
    date: "17.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Ace",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 770.00,
    gstAmount: 77.00,
    totalAmount: 847.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "21.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "received" as PaymentStatus,
    notes: "Weekly Invoice - (10.11.2025-16.11.2025) - Kebab Kraze - The day rate was reduced to $110",
  },
  // Row 7 - Inflow
  {
    month: "November",
    date: "14.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Sam",
    siteOfWork: "Mister Margherita",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 150.00,
    gstAmount: 15.00,
    totalAmount: 165.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Service Provided on the 14th of November Friday",
  },
  // Row 8 - Outflow (Cleaner Payroll)
  {
    month: "November",
    date: "20.11.2025",
    modeOfCashFlow: "outflow" as CashFlowMode,
    typeOfCashFlow: "cleaner_payroll" as CashFlowType,
    name: "Bhathiya",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: false,
    invoiceNumber: undefined,
    amountExclGst: 1208.30,
    gstAmount: 120.83,
    totalAmount: 1329.13,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "24.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "paid" as PaymentStatus,
    notes: "Service provided for the period in between (31.10.2025-16.11.2025)",
  },
  // Row 9 - Inflow
  {
    month: "November",
    date: "24.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Jasper Amoi",
    siteOfWork: "Castlemaine Steiner School & Kindergarten",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 1050.00,
    gstAmount: 105.00,
    totalAmount: 1155.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Payment invoice for period (10.11.2025-23.11.2025)",
  },
  // Row 10 - Inflow (Paid)
  {
    month: "November",
    date: "24.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Dinitha Perera",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 1020.00,
    gstAmount: 102.00,
    totalAmount: 1122.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: "23.11.2025",
    paymentReceiptNumber: "Eshan Ayya sent a SS and I confirmed.",
    status: "paid" as PaymentStatus,
    notes: "Payment invoice for period (17.11.2025-23.11.2025)",
  },
  // Row 11 - Inflow
  {
    month: "November",
    date: "24.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Ace",
    siteOfWork: "Kebab Kraze - Wollert",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 770.00,
    gstAmount: 77.00,
    totalAmount: 847.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Weekly Invoice - (17.11.2025-23.11.2025) - Kebab Kraze",
  },
  // Row 12 - Inflow
  {
    month: "November",
    date: "24.11.2025",
    modeOfCashFlow: "inflow" as CashFlowMode,
    typeOfCashFlow: "invoice" as CashFlowType,
    name: "Anthony",
    siteOfWork: "Hoopla South Morang",
    abnRegistered: true,
    gstRegistered: true,
    invoiceNumber: undefined,
    amountExclGst: 900.00,
    gstAmount: 90.00,
    totalAmount: 990.00,
    currency: "AUD",
    paymentMethod: "bank_transfer" as PaymentMethod,
    paymentDate: undefined,
    paymentReceiptNumber: undefined,
    status: "pending" as PaymentStatus,
    notes: "Fortnightly Invoice - (10.11.2025-23.11.2025) - Hoopla South Morang",
  },
];

async function addPayrollData() {
  console.log("Starting to add payroll data to Firebase...");
  
  try {
    for (let i = 0; i < payrollData.length; i++) {
      const payroll = payrollData[i];
      console.log(`Adding payroll ${i + 1}/${payrollData.length}: ${payroll.name} - ${payroll.date}`);
      
      const id = await addPayroll(payroll);
      console.log(`✓ Added payroll with ID: ${id}`);
    }
    
    console.log("\n✅ Successfully added all payroll data to Firebase!");
  } catch (error) {
    console.error("❌ Error adding payroll data:", error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  addPayrollData()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export default addPayrollData;






































