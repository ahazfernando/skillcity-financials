import { NextResponse } from "next/server";
import { addEmployeePayRate, getEmployeePayRateBySiteAndEmployee } from "@/lib/firebase/employeePayRates";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { EmployeePayRate } from "@/types/financial";

// Data extracted from the spreadsheet images
// Format: { siteName: string, employeeName: string, hourlyRate: number, travelAllowance?: number, notes?: string }
const payRateData: Array<{
  siteName: string;
  employeeName: string;
  hourlyRate: number;
  travelAllowance?: number;
  notes?: string;
}> = [
  // Castlemain Steiner School
  { siteName: "Castlemain Steiner School", employeeName: "Shenal Jude", hourlyRate: 30, travelAllowance: 10 },
  { siteName: "Castlemain Steiner School", employeeName: "Jasper Amoi", hourlyRate: 30 },
  
  // Good Shepherd Croydon
  { siteName: "Good Shepherd Croydon", employeeName: "Janith Maneesha", hourlyRate: 25 },
  { siteName: "Good Shepherd Croydon", employeeName: "Sandasi Helanima", hourlyRate: 25 },
  { siteName: "Good Shepherd Croydon", employeeName: "Sandriya Peiris", hourlyRate: 25 },
  
  // Mr Margerita
  { siteName: "Mr Margerita", employeeName: "Sonal Avishka Hewage", hourlyRate: 25 },
  
  // Kebab Kraze
  { siteName: "Kebab Kraze", employeeName: "Bhathiya Liyanage", hourlyRate: 25 },
  
  // Noble Park (Cut and Core)
  { siteName: "Noble Park (Cut and Core)", employeeName: "Sonal Avishka Hewage", hourlyRate: 25 },
  { siteName: "Noble Park (Cut and Core)", employeeName: "Binusitha Kanaharatnam", hourlyRate: 25 },
  { siteName: "Noble Park (Cut and Core)", employeeName: "Sachira Wijetunge", hourlyRate: 25 },
  
  // Collard's Childcare
  { siteName: "Collard's Childcare", employeeName: "Oween Eliyadura", hourlyRate: 25 },
  { siteName: "Collard's Childcare", employeeName: "Diman Chandima", hourlyRate: 25 },
  { siteName: "Collard's Childcare", employeeName: "Subodha Tissera", hourlyRate: 25 },
  
  // Hoopla (South Morang)
  { siteName: "Hoopla (South Morang)", employeeName: "Vethum Helith Hewapathirana", hourlyRate: 25 },
];

// Helper function to find site by name (case-insensitive, partial match)
function findSiteByName(sites: any[], name: string): any | null {
  const normalizedName = name.toLowerCase().trim();
  return sites.find(site => {
    const siteName = site.name.toLowerCase().trim();
    return siteName === normalizedName || 
           siteName.includes(normalizedName) || 
           normalizedName.includes(siteName);
  }) || null;
}

// Helper function to find employee by name (case-insensitive, partial match)
function findEmployeeByName(employees: any[], name: string): any | null {
  const normalizedName = name.toLowerCase().trim();
  return employees.find(emp => {
    const empName = emp.name.toLowerCase().trim();
    return empName === normalizedName || 
           empName.includes(normalizedName) || 
           normalizedName.includes(empName);
  }) || null;
}

export async function POST() {
  try {
    console.log("Starting to add employee pay rates data to Firebase...");
    
    // Fetch all sites and employees
    console.log("Fetching sites and employees...");
    const [sites, employees] = await Promise.all([
      getAllSites(),
      getAllEmployees(),
    ]);
    
    console.log(`Found ${sites.length} sites and ${employees.length} employees`);
    
    const results: Array<{ success: boolean; siteName: string; employeeName: string; message: string; id?: string }> = [];
    const errors: string[] = [];
    
    for (let i = 0; i < payRateData.length; i++) {
      const data = payRateData[i];
      console.log(`\nProcessing ${i + 1}/${payRateData.length}: ${data.employeeName} at ${data.siteName}`);
      
      // Find matching site
      const site = findSiteByName(sites, data.siteName);
      if (!site) {
        const error = `Site not found: ${data.siteName}`;
        console.error(`❌ ${error}`);
        errors.push(error);
        results.push({ success: false, siteName: data.siteName, employeeName: data.employeeName, message: error });
        continue;
      }
      
      // Find matching employee
      const employee = findEmployeeByName(employees, data.employeeName);
      if (!employee) {
        const error = `Employee not found: ${data.employeeName}`;
        console.error(`❌ ${error}`);
        errors.push(error);
        results.push({ success: false, siteName: data.siteName, employeeName: data.employeeName, message: error });
        continue;
      }
      
      // Check if pay rate already exists
      try {
        const existing = await getEmployeePayRateBySiteAndEmployee(site.id, employee.id);
        if (existing) {
          const message = `Pay rate already exists for ${data.employeeName} at ${data.siteName}`;
          console.log(`⚠️  ${message}`);
          results.push({ success: false, siteName: data.siteName, employeeName: data.employeeName, message });
          continue;
        }
      } catch (error) {
        // If check fails, continue anyway
        console.warn("Could not check for existing pay rate, continuing...");
      }
      
      // Create pay rate
      const payRate: Omit<EmployeePayRate, "id"> = {
        siteId: site.id,
        siteName: site.name,
        employeeId: employee.id,
        employeeName: employee.name,
        hourlyRate: data.hourlyRate,
        travelAllowance: data.travelAllowance,
        notes: data.notes,
      };
      
      try {
        const id = await addEmployeePayRate(payRate);
        const message = `✓ Added pay rate with ID: ${id}`;
        console.log(message);
        results.push({ success: true, siteName: data.siteName, employeeName: data.employeeName, message, id });
      } catch (error) {
        const errorMsg = `Failed to add pay rate: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        results.push({ success: false, siteName: data.siteName, employeeName: data.employeeName, message: errorMsg });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${payRateData.length} pay rate records. ${successCount} successful, ${failCount} failed/skipped.`,
      results,
      summary: {
        total: payRateData.length,
        successful: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Error adding employee pay rates data:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

