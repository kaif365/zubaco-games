/**
 * Generic CommonJS stub for ESM-only packages (`jose`, `jwks-rsa`) that are
 * pulled in transitively by the Apple/Google OAuth strategies. Those external
 * identity providers are NOT exercised by the HTTP E2E suite (only the phone
 * OTP flow is), and their ESM-only distribution cannot be required by Jest's
 * CommonJS module runtime.
 *
 * The stub is a callable Proxy: any property access (named import) yields a
 * no-op function, and calling it (default import, e.g. `jwksClient(...)`)
 * returns another no-op proxy. This lets the modules that import them load
 * cleanly; if OAuth verification were ever invoked it would simply no-op — but
 * no E2E test does so.
 */
'use strict';

function makeProxy() {
  return new Proxy(function () {}, {
    get: () => makeProxy(),
    apply: () => makeProxy(),
    construct: () => makeProxy(),
  });
}

module.exports = makeProxy();
