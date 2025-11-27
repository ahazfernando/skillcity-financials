import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Payroll } from "@/types/financial";
import { format } from "date-fns";

// Parse DD.MM.YYYY date format to Date object
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return null;
};

// Format date for display
const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  if (dateStr.includes('.')) return dateStr;
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
};

// Convert hex color to RGB array
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [5, 135, 23]; // Default to #058717
};

// Load image as base64
const loadImageAsBase64 = async (imagePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = imagePath;
  });
};

export const generatePayrollReport = async (
  payrolls: Payroll[],
  dateRange: { from?: Date; to?: Date } | undefined
): Promise<void> => {
  // Filter payrolls by date range
  let filteredPayrolls = payrolls;
  
  if (dateRange?.from || dateRange?.to) {
    filteredPayrolls = payrolls.filter((payroll) => {
      const payrollDate = parseDate(payroll.date);
      if (!payrollDate) return false;
      
      if (dateRange.from && dateRange.to) {
        return payrollDate >= dateRange.from && payrollDate <= dateRange.to;
      } else if (dateRange.from) {
        return payrollDate >= dateRange.from;
      } else if (dateRange.to) {
        return payrollDate <= dateRange.to;
      }
      return true;
    });
  }

  if (filteredPayrolls.length === 0) {
    throw new Error("No payroll data found for the selected date range");
  }

  // Create PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Set up colors - using #058717
  const primaryColor = hexToRgb("#058717"); // [5, 135, 23]
  const headerColor = [245, 250, 247]; // Very light green background
  const inflowColor = hexToRgb("#058717"); // [5, 135, 23]
  const outflowColor = [239, 68, 68]; // Red
  const accentColor = [255, 152, 0]; // Orange accent

  // Set consistent margins
  const leftMargin = 20;
  const rightMargin = 20;
  const topMargin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Load and add logo
  let logoAdded = false;
  let logoHeight = 0;
  try {
    // Try to load logo from public folder
    const logoPath = window.location.origin + "/logo/skillcityyy.png";
    const logoBase64 = await loadImageAsBase64(logoPath);
    // Add logo at top left with proper margins
    // Adjust logo size to fit nicely (approximately 50mm width, maintain aspect ratio)
    const logoWidth = 50;
    logoHeight = 15; // Adjust based on logo aspect ratio
    doc.addImage(logoBase64, "PNG", leftMargin, topMargin, logoWidth, logoHeight);
    logoAdded = true;
  } catch (error) {
    console.warn("Could not load logo:", error);
    // Logo will not be added, but report will continue
  }

  // Header section with professional styling
  const headerStartY = topMargin + (logoAdded ? logoHeight + 5 : 0);
  
  // Top accent bar - thin line below header
  doc.setFillColor(...primaryColor);
  const accentBarY = headerStartY + 25;
  doc.rect(0, accentBarY, pageWidth, 2, "F");
  
  // Report title section - CENTERED
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const titleY = headerStartY + 8;
  const titleText = "PAYROLL REPORT";
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, titleY);

  // Date range info - LEFT ALIGNED
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const dateRangeText = dateRange?.from && dateRange?.to
    ? `${format(dateRange.from, "dd.MM.yyyy")} - ${format(dateRange.to, "dd.MM.yyyy")}`
    : dateRange?.from
    ? `From ${format(dateRange.from, "dd.MM.yyyy")}`
    : dateRange?.to
    ? `Until ${format(dateRange.to, "dd.MM.yyyy")}`
    : "All Time";
  doc.text(`Report Period: ${dateRangeText}`, leftMargin, titleY + 6);
  doc.text(`Generated: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, leftMargin, titleY + 10);
  
  // Report ID and transaction count - RIGHT ALIGNED
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const reportIdText = `Report ID: #${format(new Date(), "yyyyMMddHHmm")}`;
  const reportIdWidth = doc.getTextWidth(reportIdText);
  doc.text(reportIdText, pageWidth - rightMargin - reportIdWidth, titleY + 6);
  const transText = `Total Transactions: ${filteredPayrolls.length}`;
  const transWidth = doc.getTextWidth(transText);
  doc.text(transText, pageWidth - rightMargin - transWidth, titleY + 10);

  // Calculate summary statistics
  const totalInflow = filteredPayrolls
    .filter((p) => p.modeOfCashFlow === "inflow")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  
  const totalOutflow = filteredPayrolls
    .filter((p) => p.modeOfCashFlow === "outflow")
    .reduce((sum, p) => sum + p.totalAmount, 0);
  
  const netCashFlow = totalInflow - totalOutflow;
  
  const totalAmountExclGst = filteredPayrolls.reduce(
    (sum, p) => sum + p.amountExclGst,
    0
  );
  
  const totalGst = filteredPayrolls.reduce((sum, p) => sum + p.gstAmount, 0);

  // Summary section - Professional invoice style
  let yPos = accentBarY + 8;
  
  // Summary header with accent bar - full width with margins
  doc.setFillColor(...primaryColor);
  doc.rect(leftMargin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const summaryTitle = "FINANCIAL SUMMARY";
  const summaryTitleWidth = doc.getTextWidth(summaryTitle);
  doc.text(summaryTitle, leftMargin + (contentWidth - summaryTitleWidth) / 2, yPos + 6);

  yPos += 12;
  
  // Summary boxes - Professional layout with proper spacing
  const boxWidth = (contentWidth - (2 * 8)) / 3; // 3 boxes with 2 spacings between them
  const boxHeight = 28;
  const startX = leftMargin;
  const spacing = 8;

  // Inflow box - Professional style
  doc.setFillColor(...headerColor);
  doc.rect(startX, yPos, boxWidth, boxHeight, "F");
  doc.setDrawColor(...inflowColor);
  doc.setLineWidth(0.8);
  doc.rect(startX, yPos, boxWidth, boxHeight, "D");
  
  // Inflow label
  doc.setFillColor(...inflowColor);
  doc.rect(startX, yPos, boxWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL INFLOW", startX + 3, yPos + 4.5);
  
  // Inflow amount
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, startX + 3, yPos + 15);
  
  // Transaction count
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${filteredPayrolls.filter(p => p.modeOfCashFlow === "inflow").length} transactions`, startX + 3, yPos + 22);

  // Outflow box - Professional style
  const outflowX = startX + boxWidth + spacing;
  doc.setFillColor(255, 245, 245);
  doc.rect(outflowX, yPos, boxWidth, boxHeight, "F");
  doc.setDrawColor(...outflowColor);
  doc.rect(outflowX, yPos, boxWidth, boxHeight, "D");
  
  // Outflow label
  doc.setFillColor(...outflowColor);
  doc.rect(outflowX, yPos, boxWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL OUTFLOW", outflowX + 3, yPos + 4.5);
  
  // Outflow amount
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, outflowX + 3, yPos + 15);
  
  // Transaction count
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${filteredPayrolls.filter(p => p.modeOfCashFlow === "outflow").length} transactions`, outflowX + 3, yPos + 22);

  // Net Cash Flow box - Highlighted
  const netX = outflowX + boxWidth + spacing;
  doc.setFillColor(255, 250, 240);
  doc.rect(netX, yPos, boxWidth, boxHeight, "F");
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1);
  doc.rect(netX, yPos, boxWidth, boxHeight, "D");
  
  // Net label
  doc.setFillColor(...accentColor);
  doc.rect(netX, yPos, boxWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("NET CASH FLOW", netX + 3, yPos + 4.5);
  
  // Net amount
  const netColor = netCashFlow >= 0 ? inflowColor : outflowColor;
  doc.setTextColor(...netColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`$${netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, netX + 3, yPos + 15);
  
  // GST info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Total GST: $${totalGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, netX + 3, yPos + 22);

  yPos += boxHeight + 12;

  // Prepare table data
  const tableData = filteredPayrolls.map((payroll, index) => [
    (index + 1).toString(),
    payroll.modeOfCashFlow === "inflow" ? "Inflow" : "Outflow",
    payroll.typeOfCashFlow === "invoice" ? "Invoice" : 
    payroll.typeOfCashFlow === "internal_payroll" ? "Internal Payroll" : 
    "Cleaner Payroll",
    formatDate(payroll.date),
    payroll.name,
    payroll.siteOfWork || "-",
    payroll.abnRegistered ? "Yes" : "No",
    payroll.gstRegistered ? "Yes" : "No",
    payroll.invoiceNumber || "-",
    `$${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    payroll.paymentMethod === "bank_transfer" ? "Bank Transfer" :
    payroll.paymentMethod === "cash" ? "Cash" :
    payroll.paymentMethod === "cheque" ? "Cheque" :
    payroll.paymentMethod === "credit_card" ? "Credit Card" : "Other",
    payroll.paymentDate ? formatDate(payroll.paymentDate) : "-",
    payroll.status === "pending" ? "Pending" :
    payroll.status === "received" ? "Received" : "Paid",
  ]);

  // Transaction details header - full width with margins
  doc.setFillColor(...primaryColor);
  doc.rect(leftMargin, yPos - 3, contentWidth, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const detailsTitle = "TRANSACTION DETAILS";
  const detailsTitleWidth = doc.getTextWidth(detailsTitle);
  doc.text(detailsTitle, leftMargin + (contentWidth - detailsTitleWidth) / 2, yPos + 1);

  // Generate table
  autoTable(doc, {
    startY: yPos + 4,
    head: [[
      "#",
      "Mode",
      "Type",
      "Date",
      "Name",
      "Site",
      "ABN",
      "GST",
      "Invoice #",
      "Amount (Excl. GST)",
      "GST Amount",
      "Total Amount",
      "Payment Method",
      "Payment Date",
      "Status",
    ]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10 }, // #
      1: { cellWidth: 20, cellStyles: { halign: "center" } }, // Mode
      2: { cellWidth: 25 }, // Type
      3: { cellWidth: 20 }, // Date
      4: { cellWidth: 30 }, // Name
      5: { cellWidth: 25 }, // Site
      6: { cellWidth: 15, cellStyles: { halign: "center" } }, // ABN
      7: { cellWidth: 15, cellStyles: { halign: "center" } }, // GST
      8: { cellWidth: 20 }, // Invoice #
      9: { cellWidth: 25, cellStyles: { halign: "right" } }, // Amount Excl GST
      10: { cellWidth: 20, cellStyles: { halign: "right" } }, // GST Amount
      11: { cellWidth: 25, cellStyles: { halign: "right", fontStyle: "bold" } }, // Total Amount
      12: { cellWidth: 25 }, // Payment Method
      13: { cellWidth: 20 }, // Payment Date
      14: { cellWidth: 20, cellStyles: { halign: "center" } }, // Status
    },
    margin: { left: leftMargin, right: rightMargin },
    styles: {
      overflow: "linebreak",
      cellPadding: 2,
    },
    didParseCell: (data) => {
      // Color code inflow/outflow
      if (data.column.index === 1) {
        const mode = data.cell.text[0];
        if (mode === "Inflow") {
          data.cell.styles.textColor = inflowColor;
          data.cell.styles.fontStyle = "bold";
        } else if (mode === "Outflow") {
          data.cell.styles.textColor = outflowColor;
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Color code status
      if (data.column.index === 14) {
        const status = data.cell.text[0];
        if (status === "Paid") {
          data.cell.styles.textColor = inflowColor;
        } else if (status === "Pending") {
          data.cell.styles.textColor = [251, 191, 36]; // Yellow
        }
      }
    },
  });

  // Footer with professional styling
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 8;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer accent line - full width
    doc.setFillColor(...primaryColor);
    doc.rect(0, footerY, pageWidth, 2, "F");
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    
    // Left footer - Company info
    doc.text("SkillCityQ - Payroll Management System", leftMargin, footerY + 5);
    
    // Center footer - Page number
    const pageText = `Page ${i} of ${pageCount}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(
      pageText,
      (pageWidth - pageTextWidth) / 2,
      footerY + 5
    );
    
    // Right footer - Generated date
    const genText = `Generated: ${format(new Date(), "dd.MM.yyyy")}`;
    const genTextWidth = doc.getTextWidth(genText);
    doc.text(
      genText,
      pageWidth - rightMargin - genTextWidth,
      footerY + 5
    );
  }

  // Generate filename
  const filename = dateRange?.from && dateRange?.to
    ? `Payroll_Report_${format(dateRange.from, "yyyyMMdd")}_${format(dateRange.to, "yyyyMMdd")}.pdf`
    : dateRange?.from
    ? `Payroll_Report_From_${format(dateRange.from, "yyyyMMdd")}.pdf`
    : dateRange?.to
    ? `Payroll_Report_Until_${format(dateRange.to, "yyyyMMdd")}.pdf`
    : `Payroll_Report_All_Time_${format(new Date(), "yyyyMMdd")}.pdf`;

  // Save PDF
  doc.save(filename);
};

