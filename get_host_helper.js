function getHost(headers) {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = headers.get("host");
  return forwardedHost || host || "localhost";
}
