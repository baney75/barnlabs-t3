import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
	"t3rgh6yjwx.ufs.sh",
]);

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const url = searchParams.get("url");
	if (!url) return new NextResponse("Missing url", { status: 400 });
	try {
		const u = new URL(url);
		if (!ALLOWED_HOSTS.has(u.host)) {
			return new NextResponse("Forbidden host", { status: 403 });
		}
		const upstream = await fetch(url, { cache: "no-store" });
		if (!upstream.ok || !upstream.body) {
			return new NextResponse("Upstream error", { status: upstream.status || 502 });
		}
		const res = new NextResponse(upstream.body, {
			status: 200,
			headers: {
				"Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": "public, max-age=3600, s-maxage=3600",
			},
		});
		return res;
	} catch {
		return new NextResponse("Bad Request", { status: 400 });
	}
}

export function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET,OPTIONS",
			"Access-Control-Allow-Headers": "*",
		},
	});
}


