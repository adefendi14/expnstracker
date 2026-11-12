/** Web Crypto `subtle` exists only in secure contexts (HTTPS or localhost). */
export function hasWebCryptoSubtle() {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}

export function isAppSecureContext() {
  if (typeof window === "undefined") return true;
  return window.isSecureContext === true && hasWebCryptoSubtle();
}

export function secureContextErrorMessage() {
  if (typeof window === "undefined") {
    return "Serve un contesto sicuro (HTTPS) per cifrare i dati.";
  }
  const { protocol, hostname, port } = window.location;
  if (protocol === "http:" && hostname !== "localhost" && hostname !== "127.0.0.1") {
    const httpsPort = "3443";
    const host = hostname;
    return (
      `Su HTTP l’IP pubblico non può usare la cifratura del browser (crypto.subtle). ` +
      `Apri l’app in HTTPS, ad esempio https://${host}:${httpsPort}/ ` +
      `(accetta il certificato se richiesto). HTTP resta su ${protocol}//${hostname}${port ? `:${port}` : ""}/ solo come redirect.`
    );
  }
  return "Questo browser non espone Web Crypto. Usa HTTPS o un browser aggiornato.";
}

export function assertWebCrypto() {
  if (hasWebCryptoSubtle()) return;
  throw new Error(secureContextErrorMessage());
}
