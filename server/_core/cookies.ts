import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * 
 * CORRIGIDO para lidar com TLDs compostos brasileiros (.com.br, .gov.br, etc.)
 * 
 * Exemplos:
 * - "relevanteen.aleftec.com.br" -> ".aleftec.com.br"
 * - "aleftec.com.br" -> undefined (usa hostname exato)
 * - "3000-xxx.manuspre.computer" -> ".manuspre.computer"
 * - "localhost" -> undefined
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Lista de TLDs compostos brasileiros comuns
  const compositeTLDs = new Set([
    "com.br", "net.br", "org.br", "gov.br", "edu.br", 
    "mil.br", "art.br", "etc.br", "adv.br", "odo.br",
    "eng.br", "jor.br", "med.br", "mus.br", "not.br",
    "psi.br", "qsl.br", "radio.br", "rec.br", "srv.br",
    "tmp.br", "tur.br", "tv.br", "vet.br", "zlg.br",
    "blog.br", "flog.br", "nom.br", "vlog.br", "wiki.br",
    "eco.br", "emp.br", "ind.br"
  ]);

  // Verificar se é um TLD composto
  if (parts.length >= 2) {
    const possibleCompositeTLD = parts.slice(-2).join(".");
    
    if (compositeTLDs.has(possibleCompositeTLD)) {
      // É um TLD composto (ex: .com.br)
      if (parts.length >= 4) {
        // Ex: "relevanteen.aleftec.com.br" -> ".aleftec.com.br"
        return "." + parts.slice(-3).join(".");
      } else if (parts.length === 3) {
        // Ex: "aleftec.com.br" -> não define domínio (usa hostname exato)
        return undefined;
      }
    }
  }

  // Para domínios com TLD simples (.com, .org, etc.)
  if (parts.length >= 3) {
    // Ex: "3000-xxx.manuspre.computer" -> ".manuspre.computer"
    return "." + parts.slice(-2).join(".");
  }

  // Para domínios de 2 partes (ex: "example.com"), não define domínio
  return undefined;
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);
  const secure = isSecureRequest(req);

  return {
    domain,
    httpOnly: true,
    path: "/",
    // SameSite=None requires Secure=true in modern browsers.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
