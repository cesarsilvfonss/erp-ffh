import https from "https";
import dns from "dns";

// Forzar prioridad IPv4 a nivel DNS en Node
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignorar si no está disponible
}

/**
 * Realiza una petición HTTPS forzando IPv4 (family: 4), sin reutilizar sockets viejos (agent: false)
 * y con hard-timeout en JS para evitar cuelgues de IPv6/undici o cambios de red.
 */
export function ipv4PostJson(
  urlStr: string,
  body?: any,
  timeoutMs = 35000
): Promise<{ status: number; data: any; rawText: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const hasBody = body !== undefined;
    const payload = hasBody ? JSON.stringify(body) : "";

    const headers: Record<string, string | number> = {
      Accept: "application/json",
      Connection: "close",
    };
    if (hasBody) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    let settled = false;
    const finishResolve = (val: { status: number; data: any; rawText: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      resolve(val);
    };
    const finishReject = (err: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      reject(err);
    };

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: u.pathname + u.search,
        method: hasBody ? "POST" : "GET",
        family: 4,
        agent: false,
        headers,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const rawText = Buffer.concat(chunks).toString("utf-8");
          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch {
            data = { rawText };
          }
          finishResolve({
            status: res.statusCode || 500,
            data,
            rawText,
          });
        });
        res.on("error", (err) => finishReject(err));
      }
    );

    const hardTimer = setTimeout(() => {
      try {
        req.destroy();
      } catch {
        // ignore
      }
      finishReject(new Error(`HardTimeout (${timeoutMs}ms) conectando a ${u.hostname}`));
    }, timeoutMs);

    req.on("timeout", () => {
      try {
        req.destroy();
      } catch {
        // ignore
      }
      finishReject(new Error(`Timeout (${timeoutMs}ms) conectando a ${u.hostname}`));
    });

    req.on("error", (err) => {
      finishReject(err);
    });

    if (hasBody) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Descarga un archivo binario (ej. nota de voz .ogg de Telegram) forzando IPv4 (family: 4).
 */
export function ipv4DownloadBuffer(urlStr: string, timeoutMs = 25000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    let settled = false;

    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: u.pathname + u.search,
        method: "GET",
        family: 4,
        agent: false,
        headers: { Connection: "close" },
        timeout: timeoutMs,
      },
      (res) => {
        if ((res.statusCode || 500) >= 400) {
          if (!settled) {
            settled = true;
            clearTimeout(hardTimer);
            reject(new Error(`HTTP ${res.statusCode} descargando archivo de ${u.hostname}`));
          }
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          if (!settled) {
            settled = true;
            clearTimeout(hardTimer);
            resolve(Buffer.concat(chunks));
          }
        });
        res.on("error", (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(hardTimer);
            reject(err);
          }
        });
      }
    );

    const hardTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          req.destroy();
        } catch {
          // ignore
        }
        reject(new Error(`HardTimeout descargando archivo de ${u.hostname}`));
      }
    }, timeoutMs);

    req.on("timeout", () => {
      if (!settled) {
        settled = true;
        clearTimeout(hardTimer);
        req.destroy();
        reject(new Error(`Timeout descargando archivo de ${u.hostname}`));
      }
    });

    req.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(hardTimer);
        reject(err);
      }
    });

    req.end();
  });
}
