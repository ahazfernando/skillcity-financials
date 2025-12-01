import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Payroll } from "@/types/financial";

// Helper function to format date from DD.MM.YYYY to readable format
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "-";
  try {
    const parts = dateString.split(".");
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      return `${day}.${month}.${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};

// Helper function to format payment method
const formatPaymentMethod = (method: string | undefined): string => {
  if (!method) return "-";
  const methodMap: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    cheque: "Cheque",
    credit_card: "Credit Card",
    other: "Other",
  };
  return methodMap[method] || method;
};

// Helper function to format status
const formatStatus = (status: string | undefined): string => {
  if (!status) return "-";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const generateMonthlyReport = async (
  payrolls: Payroll[],
  month: string, // Format: "YYYY-MM" or date range
  logoPath: string = "/logo/skillcityyy.png"
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Header Section with Logo and Title
  let logoHeight = 0;
  const logoWidth = 80;
  const headerTop = margin;
  
  // Add logo on the left
  try {
    // Convert image to base64 for jsPDF
    const response = await fetch(logoPath);
    if (!response.ok) {
      throw new Error("Logo not found");
    }
    const blob = await response.blob();
    const reader = new FileReader();
    
    await new Promise<void>((resolve) => {
      reader.onloadend = () => {
        try {
          const base64data = reader.result as string;
          // Create an image to get actual dimensions
          const img = new Image();
          img.src = base64data;
          img.onload = () => {
            logoHeight = (img.height / img.width) * logoWidth;
            doc.addImage(base64data, "PNG", margin, headerTop, logoWidth, logoHeight);
            resolve();
          };
          img.onerror = () => {
            console.warn("Could not load logo image");
            resolve(); // Continue without logo
          };
        } catch (error) {
          console.warn("Could not add logo to PDF:", error);
          resolve(); // Continue without logo
        }
      };
      reader.onerror = () => {
        console.warn("Could not read logo file");
        resolve(); // Continue without logo
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
    // Continue without logo
  }

  // Company slogan/name below logo
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Financial Management System", margin, headerTop + (logoHeight || 20) + 8);

  // "INVOICE" or "REPORT" title on the right in orange
  const orangeColor = [255, 152, 0]; // Orange color
  doc.setFontSize(32);
  doc.setTextColor(...orangeColor);
  doc.setFont("helvetica", "bold");
  doc.text("MONTHLY REPORT", pageWidth - margin, headerTop + 15, { align: "right" });

  // Invoice details section
  const detailsTop = headerTop + (logoHeight || 20) + 20;
  
  // Draw horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, detailsTop, pageWidth - margin, detailsTop);
  
  // Left column - Invoice details
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Report Period:", margin, detailsTop + 8);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(month, margin, detailsTop + 15);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text("Generated on:", margin, detailsTop + 25);
  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(reportDate, margin, detailsTop + 32);

  // Right column - Total Due section (like in the screenshot)
  const rightColumnX = pageWidth - margin - 100;
  const totalDueTop = detailsTop + 5;
  
  // Calculate total due
  const totalDue = payrolls.reduce((sum, p) => sum + p.totalAmount, 0);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL DUE", rightColumnX, totalDueTop + 8);
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightColumnX, totalDueTop + 20);
  
  // Additional info below
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Records: ${payrolls.length}`, rightColumnX, totalDueTop + 30);
  
  // Draw another horizontal line
  doc.line(margin, detailsTop + 40, pageWidth - margin, detailsTop + 40);

  // Prepare table data
  const tableData = payrolls.map((payroll) => [
    payroll.invoiceNumber || "-",
    payroll.name || "-",
    payroll.siteOfWork || "-",
    `$${payroll.amountExclGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${payroll.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${payroll.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatDate(payroll.date),
    "-", // Due Date (not applicable for payroll)
    formatStatus(payroll.status),
    formatPaymentMethod(payroll.paymentMethod),
    formatDate(payroll.paymentDate),
  ]);

  // Calculate totals
  const totalAmount = payrolls.reduce((sum, p) => sum + p.amountExclGst, 0);
  const totalGST = payrolls.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalTotal = payrolls.reduce((sum, p) => sum + p.totalAmount, 0);

  // Add summary row
  tableData.push([
    "TOTAL",
    "",
    "",
    `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${totalGST.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${totalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    "",
    "",
    "",
    "",
    "",
  ]);

  // Table columns
  const columns = [
    "Invoice #",
    "Name",
    "Site of Work",
    "Amount",
    "GST",
    "Total",
    "Issue Date",
    "Due Date",
    "Status",
    "Payment Method",
    "Payment Date",
  ];

  // Generate table
  autoTable(doc, {
    head: [columns],
    body: tableData,
    startY: detailsTop + 50,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [5, 135, 23], // Green color matching the theme
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Invoice #
      1: { cellWidth: 30 }, // Name
      2: { cellWidth: 30 }, // Site of Work
      3: { cellWidth: 20 }, // Amount
      4: { cellWidth: 18 }, // GST
      5: { cellWidth: 20 }, // Total
      6: { cellWidth: 25 }, // Issue Date
      7: { cellWidth: 20 }, // Due Date
      8: { cellWidth: 20 }, // Status
      9: { cellWidth: 25 }, // Payment Method
      10: { cellWidth: 25 }, // Payment Date
    },
    didParseCell: (data) => {
      // Style the total row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fillColor = [240, 240, 240];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [0, 0, 0];
      }
    },
  });

  // Save the PDF
  const fileName = `Monthly_Report_${month.replace(/\//g, "_")}.pdf`;
  doc.save(fileName);
};

