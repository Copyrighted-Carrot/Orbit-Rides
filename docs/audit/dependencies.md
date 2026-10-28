# Dependency audit — 28 October 2026

Registry result from `npm audit --json`, using the existing lockfile. 25 package entries: 3 critical, 13 high, 5 moderate, 4 low. Entries can inherit severity and combine multiple advisories; this is not a count of independently demonstrated application exploits. Some advisories depend on unused features or tooling. No `audit fix` or dependency modification was applied. Scope is inferred from lockfile dev flags, not a proof of runtime reachability. Linked advisories are audit-record references; only the two Next primary advisories in SYSTEM_AUDIT.md were independently opened.

| Package | Locked version(s) | Severity | Relationship | Scope | Sample references |
|---|---|---|---|---|---|
| @babel/runtime | 7.25.7 | moderate | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-968p-4wvh-cqc8) |
| @supabase/auth-js | 2.65.0 | low | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-8r88-6cj9-9fh5) |
| @supabase/ssr | 0.5.1 | low | Direct | Runtime graph | Inherited from dependency |
| @supabase/supabase-js | 2.45.4 | low | Direct | Runtime graph | Inherited from dependency |
| ajv | 6.12.6 | moderate | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6) |
| brace-expansion | 2.0.1, 1.1.11 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw), [Advisory](https://github.com/advisories/GHSA-v6h2-p8h4-qcjw), [Advisory](https://github.com/advisories/GHSA-f886-m6hf-6m8v) |
| cookie | 0.6.0 | low | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) |
| cross-spawn | 7.0.3 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-3xgq-45jj-v275) |
| flatted | 3.3.1 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-25h7-pfq9-p65f), [Advisory](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh) |
| glob | 10.3.10 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) |
| js-yaml | 4.1.0 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-mh29-5h37-fv8m), [Advisory](https://github.com/advisories/GHSA-h67p-54hq-rp68), [Advisory](https://github.com/advisories/GHSA-52cp-r559-cp3m) |
| minimatch | 9.0.5, 3.1.2 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-3ppc-4f35-3m26), [Advisory](https://github.com/advisories/GHSA-3ppc-4f35-3m26), [Advisory](https://github.com/advisories/GHSA-7r86-cg39-jmmj) |
| nanoid | 3.3.7 | high | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-mwcw-c2x4-8c55), [Advisory](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [Advisory](https://github.com/advisories/GHSA-2v37-7h3g-55p8) |
| next | 15.0.1 | critical | Direct | Runtime graph | [Advisory](https://github.com/advisories/GHSA-7m27-7ghc-44w9), [Advisory](https://github.com/advisories/GHSA-3h52-269p-cp9r), [Advisory](https://github.com/advisories/GHSA-g5qg-72qw-gw5v) |
| picomatch | 2.3.1 | high | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-3v7f-55p6-f55p), [Advisory](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) |
| postcss | 8.4.31, 8.4.47 | high | Direct | Runtime graph | [Advisory](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [Advisory](https://github.com/advisories/GHSA-6g55-p6wh-862q), [Advisory](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) |
| postcss-selector-parser | 6.1.2 | moderate | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-w9m9-85wc-3x92), [Advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) |
| qs | 6.13.1 | moderate | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-w7fw-mjwx-w883), [Advisory](https://github.com/advisories/GHSA-6rw7-vpxm-498p), [Advisory](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) |
| sharp | 0.33.5 | high | Direct | Runtime graph | [Advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [Advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), [Advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) |
| source-map-js | 1.2.1 | high | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) |
| supabase | 1.204.3 | high | Direct | Development graph | Inherited from dependency |
| swiper | 11.1.14 | critical | Direct | Runtime graph | [Advisory](https://github.com/advisories/GHSA-hmx5-qpq5-p643) |
| tar | 7.4.3 | critical | Transitive | Development graph | [Advisory](https://github.com/advisories/GHSA-34x7-hfp2-rc4v), [Advisory](https://github.com/advisories/GHSA-8qq5-rm4j-mr97), [Advisory](https://github.com/advisories/GHSA-83g3-92jg-28cx) |
| ws | 8.18.0 | high | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), [Advisory](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) |
| yaml | 1.10.2, 2.5.1 | moderate | Transitive | Runtime graph | [Advisory](https://github.com/advisories/GHSA-48c2-rrv3-qjmp), [Advisory](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) |

Existing `npm ls --depth=0`, lint, TypeScript and build pass. Fresh installation and upgrade compatibility remain unverified. `clsx` must become an explicit dependency if retained. Stripe/Turnstile are unused package candidates, pending product review.
