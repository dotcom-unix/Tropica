import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/favicon", async (req, res) => {
  const domain = req.query["domain"];

  if (typeof domain !== "string" || !domain.trim()) {
    res.status(400).send("Missing favicon domain");
    return;
  }

  let hostname: string;
  try {
    const parsed = new URL(`https://${domain.trim()}`);
    if (parsed.hostname !== domain.trim().toLowerCase() || parsed.pathname !== "/") {
      throw new Error("Invalid domain");
    }
    hostname = parsed.hostname;
  } catch {
    res.status(400).send("Invalid favicon domain");
    return;
  }

  try {
    const upstream = await fetch(`https://${hostname}/favicon.ico`, {
      headers: {
        "User-Agent": "Mozilla/5.0 Tropic Browser/1.0",
        Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      res.status(404).end();
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/x-icon";
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    req.log.debug({ err, hostname }, "Favicon fetch failed");
    res.status(404).end();
  }
});

export default router;