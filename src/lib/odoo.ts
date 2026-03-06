/**
 * Odoo XML-RPC Client
 *
 * Cliente ligero que se comunica con Odoo usando el protocolo XML-RPC estándar.
 * No requiere dependencias externas — usa `fetch` (disponible en Next.js / Node 18+).
 *
 * Credenciales: variables de entorno ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD
 */

// ─────────────────────────────────────────────────────────────────────────────
// XML-RPC Encoder  (JS → XML)
// ─────────────────────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function encodeValue(v: unknown): string {
  if (v === null || v === undefined) return "<value><nil/></value>";
  if (typeof v === "boolean")
    return `<value><boolean>${v ? 1 : 0}</boolean></value>`;
  if (typeof v === "number")
    return Number.isInteger(v)
      ? `<value><int>${v}</int></value>`
      : `<value><double>${v}</double></value>`;
  if (typeof v === "string")
    return `<value><string>${xmlEscape(v)}</string></value>`;
  if (Array.isArray(v))
    return `<value><array><data>${v.map(encodeValue).join("")}</data></array></value>`;
  if (typeof v === "object") {
    const members = Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `<member><name>${xmlEscape(k)}</name>${encodeValue(val)}</member>`)
      .join("");
    return `<value><struct>${members}</struct></value>`;
  }
  return `<value><string>${xmlEscape(String(v))}</string></value>`;
}

function buildCall(method: string, params: unknown[]): string {
  const encodedParams = params
    .map((p) => `<param>${encodeValue(p)}</param>`)
    .join("");
  return `<?xml version='1.0'?><methodCall><methodName>${method}</methodName><params>${encodedParams}</params></methodCall>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// XML-RPC Decoder  (XML → JS)
// ─────────────────────────────────────────────────────────────────────────────

function xmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Tokenizer minimalista para XML-RPC.
 * Recorre el string de XML con un puntero `i` y expone métodos para leer
 * etiquetas y texto. Suficiente para el subconjunto de XML que Odoo produce.
 */
class XmlTok {
  i = 0;
  constructor(private s: string) {}

  /** Avanza el puntero sobre espacios en blanco. */
  ws() {
    while (this.i < this.s.length && " \t\n\r".includes(this.s[this.i]))
      this.i++;
  }

  /** True si la próxima etiqueta es de cierre  </tag> */
  isCls(): boolean {
    this.ws();
    return this.s[this.i] === "<" && this.s[this.i + 1] === "/";
  }

  /** True si la próxima etiqueta es auto-cerrada  <tag/> */
  isSC(): boolean {
    this.ws();
    if (this.s[this.i] !== "<") return false;
    const e = this.s.indexOf(">", this.i);
    return e !== -1 && this.s[e - 1] === "/";
  }

  /**
   * Lee la próxima etiqueta (<tag>, </tag> o <tag/>) y devuelve el nombre.
   * Avanza el puntero hasta después del '>'.
   */
  tag(): string {
    this.ws();
    const e = this.s.indexOf(">", this.i);
    // Toma el contenido entre < y >, quita slashes y atributos
    const inner = this.s.slice(this.i + 1, e).trim();
    this.i = e + 1;
    return inner
      .replace(/^\//, "")    // closing tag: /foo → foo
      .replace(/\/$/, "")    // self-close: foo/ → foo
      .split(/\s/)[0];       // strip attributes: foo bar="x" → foo
  }

  /** Lee texto plano hasta el próximo '<'. */
  txt(): string {
    const e = this.s.indexOf("<", this.i);
    const t =
      e === -1 ? this.s.slice(this.i) : this.s.slice(this.i, e);
    this.i = e === -1 ? this.s.length : e;
    return xmlUnescape(t);
  }

  /**
   * Parsea un nodo XML-RPC (<value>, <int>, <string>, <array>, <struct>, etc.)
   * y devuelve el valor JavaScript equivalente.
   */
  val(): unknown {
    this.ws();

    // Etiqueta auto-cerrada → null  (e.g. <nil/>)
    if (this.isSC()) {
      this.tag();
      return null;
    }

    const t = this.tag();

    switch (t) {
      case "value": {
        this.ws();
        let r: unknown;
        if (this.isCls()) {
          r = ""; // <value></value> → string vacío
        } else if (this.isSC()) {
          this.tag(); r = null; // <nil/> dentro de <value>
        } else if (this.s[this.i] === "<") {
          r = this.val(); // tipo explícito: <int>, <string>, etc.
        } else {
          r = this.txt(); // string implícito (sin etiqueta de tipo)
        }
        this.ws();
        if (this.isCls()) this.tag(); // </value>
        return r;
      }

      case "int":
      case "i4":
      case "i8": {
        const n = parseInt(this.txt(), 10);
        this.ws(); this.tag(); // </int>
        return n;
      }

      case "double": {
        const n = parseFloat(this.txt());
        this.ws(); this.tag(); // </double>
        return n;
      }

      case "boolean": {
        const b = this.txt().trim() === "1";
        this.ws(); this.tag(); // </boolean>
        return b;
      }

      case "string": {
        const s = this.isCls() ? "" : this.txt();
        this.ws(); this.tag(); // </string>
        return s;
      }

      case "array": {
        this.ws(); this.tag(); // <data>
        const arr: unknown[] = [];
        this.ws();
        while (!this.isCls()) {
          arr.push(this.val());
          this.ws();
        }
        this.tag(); // </data>
        this.ws(); this.tag(); // </array>
        return arr;
      }

      case "struct": {
        const obj: Record<string, unknown> = {};
        this.ws();
        while (!this.isCls()) {
          this.tag(); // <member>
          this.ws(); this.tag(); // <name>
          const key = this.txt();
          this.ws(); this.tag(); // </name>
          this.ws();
          obj[key] = this.val(); // <value>...</value>
          this.ws(); this.tag(); // </member>
          this.ws();
        }
        this.tag(); // </struct>
        return obj;
      }

      case "nil": {
        this.ws();
        if (this.isCls()) this.tag(); // </nil>  (si no fue auto-cerrado)
        return null;
      }

      default: {
        // Etiqueta desconocida — saltarla hasta el cierre
        while (!this.isCls()) {
          this.ws();
          if (this.s[this.i] === "<") this.tag();
          else this.txt();
        }
        this.tag();
        return null;
      }
    }
  }
}

/**
 * Parsea la respuesta XML-RPC completa de Odoo y devuelve el valor JavaScript.
 * Lanza un Error si Odoo respondió con un fault (error).
 */
function parseXmlRpcResponse(xml: string): unknown {
  // Eliminar declaración XML  <?xml ...?>
  const s = xml.replace(/<\?[^?]*\?>/g, "").trim();
  const p = new XmlTok(s);

  p.tag(); // <methodResponse>
  p.ws();
  const inner = p.tag(); // <params>  o  <fault>

  if (inner === "fault") {
    p.ws();
    const f = p.val() as { faultCode: number; faultString: string };
    throw new Error(`Odoo error ${f.faultCode}: ${f.faultString}`);
  }

  // Estructura normal: <params><param><value>...</value></param></params>
  p.ws(); p.tag(); // <param>
  p.ws();
  const result = p.val();
  p.ws(); p.tag(); // </param>
  p.ws(); p.tag(); // </params>

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────────────────────────────────────

async function xmlrpcPost(url: string, body: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

// ─────────────────────────────────────────────────────────────────────────────
// OdooClient
// ─────────────────────────────────────────────────────────────────────────────

export class OdooClient {
  private uid: number | null = null;

  constructor(
    private readonly url: string,   // e.g. "https://mi-empresa.odoo.com"
    private readonly db: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  /** Autentica contra Odoo y guarda el uid en caché. */
  async authenticate(): Promise<void> {
    if (this.uid !== null) return;

    const body = buildCall("authenticate", [
      this.db, this.username, this.password, {},
    ]);
    const xml = await xmlrpcPost(`${this.url}/xmlrpc/2/common`, body);
    const uid = parseXmlRpcResponse(xml);

    if (!uid || typeof uid !== "number") {
      throw new Error("Autenticación fallida: usuario o contraseña incorrectos");
    }
    this.uid = uid;
  }

  /**
   * Llama a `execute_kw` en Odoo — el equivalente de hacer un RPC a cualquier
   * método de cualquier modelo.
   *
   * @param model  Nombre del modelo, e.g. "res.partner"
   * @param method Método a ejecutar, e.g. "search_read"
   * @param args   Argumentos posicionales (array)
   * @param kwargs Argumentos por nombre (objeto)
   */
  async executeKw(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<unknown> {
    await this.authenticate();

    const body = buildCall("execute_kw", [
      this.db, this.uid, this.password,
      model, method, args, kwargs,
    ]);
    const xml = await xmlrpcPost(`${this.url}/xmlrpc/2/object`, body);
    return parseXmlRpcResponse(xml);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton (una sola instancia por proceso de Node)
// ─────────────────────────────────────────────────────────────────────────────

let _client: OdooClient | null = null;

/**
 * Devuelve la instancia singleton de OdooClient.
 * Lee las credenciales de las variables de entorno:
 *   ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD
 */
export function getOdooClient(): OdooClient {
  if (_client) return _client;

  const { ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD } = process.env;
  if (!ODOO_URL || !ODOO_DB || !ODOO_USERNAME || !ODOO_PASSWORD) {
    throw new Error(
      "Faltan variables de entorno de Odoo. Define ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD en .env.local",
    );
  }

  _client = new OdooClient(
    ODOO_URL.replace(/\/$/, ""), // quitar trailing slash
    ODOO_DB,
    ODOO_USERNAME,
    ODOO_PASSWORD,
  );
  return _client;
}
