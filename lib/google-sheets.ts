import { google } from "googleapis";

export function getGoogleSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.GOOGLE_CLIENT_EMAIL || !privateKey || !process.env.GOOGLE_PROJECT_ID) {
    return null;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function testSheetsConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return { success: false, error: "Google Sheets not configured" };
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return { success: false, error: "GOOGLE_SHEET_ID not set" };
    await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }
}

export interface SheetLeadRow {
  leadId: string;
  studentName: string;
  phone: string;
  email: string;
  educationLevel: string;
  country: string;
  course: string;
  intake: string;
  source: string;
  status: string;
  counsellor: string;
  branch: string;
  createdBy: string;
  createdAt: string;
  nextFollowUp: string;
  notes: string;
}

export async function appendLeadToSheet(lead: SheetLeadRow): Promise<{ success: boolean; error?: string }> {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return { success: false, error: "Google Sheets not configured" };
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return { success: false, error: "GOOGLE_SHEET_ID not set" };

    const row = [
      lead.leadId, lead.studentName, lead.phone, lead.email,
      lead.educationLevel, lead.country, lead.course, lead.intake,
      lead.source, lead.status, lead.counsellor, lead.branch,
      lead.createdBy, lead.createdAt, lead.nextFollowUp, lead.notes,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Leads!A:P",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }
}

export async function ensureSheetHeaders(): Promise<void> {
  try {
    const sheets = getGoogleSheetsClient();
    if (!sheets) return;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) return;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Leads!A1:P1",
    });

    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Leads!A1:P1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "Lead ID", "Name", "Phone", "Email", "Education Level", "Country",
            "Course", "Intake", "Source", "Status", "Counsellor", "Branch",
            "Created By", "Created At", "Next Follow-up", "Notes",
          ]],
        },
      });
    }
  } catch {
    // Non-fatal
  }
}
