/**
 * TTS Proxy — fetches edge-tts audio from the local bridge (port 5555)
 * and streams it back. Works on localhost; on Vercel the relay handles TTS.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const text = url.searchParams.get("text");
  if (!text) {
    return new Response(JSON.stringify({ error: "Missing 'text' param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bridgeUrl = `http://127.0.0.1:5555/api/tts?text=${encodeURIComponent(text)}`;
    const res = await fetch(bridgeUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Bridge returned ${res.status}`);

    const blob = await res.blob();
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "TTS proxy failed: " + err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
