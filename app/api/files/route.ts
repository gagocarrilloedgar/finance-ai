import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Parse PDF text
    const buffer = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Process with Gemini
    const prompt = `
      Analyze this bank transaction PDF text and extract structured data from the file.

      Extract ONLY these fields:
      - date: Transaction date in ISO format (YYYY-MM-DD)
      - amount: Numeric value with proper sign (positive for deposits, negative for withdrawals). Take into accound we are loking only for either the input (salida de dinero) or the output (entrada de dinero column).
      - description: Brief transaction description
      - category: Transaction category
      - type: "EARNING" or "EXPENSE"

      An example of a row from a pdf file would be:
      Fecha | Tipo | Descripción | Entrada de dinero | Salida de dinero
      31 ene 2025 | Transacción con tarjeta  | MERCADONA C.C. ARENAS  | | 17,26 €

      Return as a JSON array of transactions. Validate amounts and dates.
      Example:
      [{
        "date": "2023-12-31",
        "amount": -49.99,
        "description": "Amazon Purchase",
        "category": "Shopping",
        "type": "EXPENSE"
      }]
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer,
          mimeType: "application/pdf"
        }
      },
      prompt
    ]);
    const jsonString = result.response.text().replace(/```json|```/g, "");

    try {
      const transactions = JSON.parse(jsonString);
      return NextResponse.json(transactions);
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Failed to parse Gemini response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("PDF processing error:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
