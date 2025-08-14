import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testName, failureLogsAndErrors, codeSnippet } = body;

    if (!testName || !failureLogsAndErrors) {
      return NextResponse.json({ message: 'Missing required fields: testName and failureLogsAndErrors' }, { status: 400 });
    }

    const externalApiResponse = await fetch("https://ai-test-analyser.netlify.app/api/analyze", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testName,
        failureLogsAndErrors,
        codeSnippet: codeSnippet || '',
      }),
    });

    if (!externalApiResponse.ok) {
      const errorBody = await externalApiResponse.text();
      console.error(`External API error: ${externalApiResponse.status}`, errorBody);
      return NextResponse.json({ message: `Error from external API: ${errorBody}` }, { status: externalApiResponse.status });
    }

    const data = await externalApiResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/analyze-test:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
