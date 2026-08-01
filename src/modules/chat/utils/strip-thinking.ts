const OPEN_TAG = '<think>';
const CLOSE_TAG = '</think>';

/**
 * Algunos modelos (p. ej. derivados de Qwen3) ignoran `think:false` a nivel
 * de API y de todas formas emiten su razonamiento crudo envuelto en
 * <think>...</think> dentro de `message.content`. Sin este filtro, ese
 * razonamiento (casi siempre en inglés, sea cual sea el idioma pedido) se
 * cuela tal cual en la respuesta que ve el usuario.
 */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Versión streaming del filtro anterior: recibe tokens uno a uno y devuelve
 * solo la porción segura para reenviar al cliente, reteniendo en buffer lo
 * necesario para no partir una etiqueta a la mitad entre chunks.
 */
export function createThinkingStreamFilter() {
  let buffer = '';
  let insideThink = false;

  return function filter(token: string): string {
    buffer += token;
    let output = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!insideThink) {
        const openIdx = buffer.indexOf(OPEN_TAG);
        if (openIdx === -1) {
          const safeLength = Math.max(0, buffer.length - (OPEN_TAG.length - 1));
          output += buffer.slice(0, safeLength);
          buffer = buffer.slice(safeLength);
          break;
        }
        output += buffer.slice(0, openIdx);
        buffer = buffer.slice(openIdx + OPEN_TAG.length);
        insideThink = true;
      } else {
        const closeIdx = buffer.indexOf(CLOSE_TAG);
        if (closeIdx === -1) {
          const safeLength = Math.max(0, buffer.length - (CLOSE_TAG.length - 1));
          buffer = buffer.slice(safeLength);
          break;
        }
        buffer = buffer.slice(closeIdx + CLOSE_TAG.length);
        insideThink = false;
      }
    }

    return output;
  };
}
