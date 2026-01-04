import type { CookieOptions, Request } from "express";

/**
 * Verifica se a requisição é segura (HTTPS).
 * Considera tanto o protocolo direto quanto o header X-Forwarded-Proto
 * enviado por proxies reversos como Traefik.
 */
function isSecureRequest(req: Request): boolean {
  // Verifica protocolo direto
  if (req.protocol === "https") return true;

  // Verifica header do proxy reverso
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) 
    ? forwardedProto 
    : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Retorna as opções de configuração para o cookie de sessão.
 * 
 * IMPORTANTE: Esta função NÃO define o atributo 'domain' do cookie.
 * Isso faz com que o navegador use o hostname EXATO da requisição,
 * garantindo que o cookie seja enviado APENAS para o subdomínio específico.
 * 
 * Exemplo:
 * - Cookie criado em: relevanteen.aleftec.com.br
 * - Cookie será enviado APENAS para: relevanteen.aleftec.com.br
 * - Cookie NÃO será enviado para: outro-app.aleftec.com.br
 * 
 * Isso aumenta a segurança ao isolar cookies entre diferentes subdomínios
 * e previne vazamento de sessão entre aplicações.
 * 
 * @param req - Objeto Request do Express
 * @returns Opções de configuração do cookie
 */
export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    // NÃO define domain - navegador usará o hostname exato (req.hostname)
    // domain: undefined,
    
    // HttpOnly: Cookie não acessível via JavaScript (previne XSS)
    httpOnly: true,
    
    // Path: Cookie disponível em todas as rotas
    path: "/",
    
    // SameSite: "none" para HTTPS (permite CORS), "lax" para HTTP
    // Nota: SameSite=None requer Secure=true em navegadores modernos
    sameSite: secure ? "none" : "lax",
    
    // Secure: Cookie só enviado via HTTPS (previne interceptação)
    secure,
  };
}
