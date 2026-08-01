import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const primaryPath = path.join(
      process.cwd(),
      "public",
      "Previous_Item_Cycle_Report_Historical_DB_Data.xlsx"
    );
    const fallbackPath = path.join(
      process.cwd(),
      "..",
      "Previous_Item_Cycle_Report_Historical_DB_Data.xlsx"
    );

    const filePath = fs.existsSync(primaryPath)
      ? primaryPath
      : fallbackPath;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "DB File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Previous_Item_Cycle_Report_Historical_DB_Data.xlsx"',
      },
    });
  } catch (error) {
    console.error("API error serving historical DB:", error);
    return NextResponse.json(
      { error: "Failed to read database file" },
      { status: 500 }
    );
  }
}
