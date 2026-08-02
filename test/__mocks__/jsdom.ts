// jsdom (vía html-encoding-sniffer -> @exodus/bytes) es ESM puro y rompe la
// transformación CJS por defecto de Jest. Los tests de humo no ejercen el
// endpoint de conversión de documentos HTML, así que se sustituye por un stub.
export class JSDOM {
  constructor() {
    throw new Error('jsdom no está disponible en el entorno de tests de humo');
  }
}
