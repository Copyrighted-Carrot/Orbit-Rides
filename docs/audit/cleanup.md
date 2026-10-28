# Repository cleanup — 28 October 2026

Changes are on `audit/repository-review`. No application TS/TSX/SQL or dependency versions changed.

## Archived unused assets

All six files below had no reference in application/library/style/config/README source. Current auth pages use `auth-background.jpg`. These are legacy assets, not asserted to be byte-identical duplicates. They were moved out of the repository into `D:/Orbit Rides/cleanup-backup-2026-10-28/`, preserving their relative paths, with SHA-256 hashes in that folder’s manifest.json. Total: 15,986,583 bytes (15.25 MiB). Restore an individual file from that backup if it is needed. They remain recoverable from baseline Git history as well.

| Original path | Bytes | SHA-256 |
|---|---:|---|
| `public/images/New folder/logo-dark.png` | 2375875 | `D3A0E3B39E37E7295C1992A9EE699943FDCCD7BA87621C86788C196AC65A2606` |
| `public/images/New folder/logo-dark.svg` | 1027 | `11352E0062A1A4790ABBFB8B87F68B4932F5E86872AB86EBEC7E1897107A1AFE` |
| `public/images/New folder/logo-light.png` | 6450761 | `651CEC081D55905ADF02546EADBDF51FF7F148E0A018502F8B70F789FD939002` |
| `public/images/New folder/logo-light.svg` | 1014 | `8E4BA95271B790729CB35775C331B354F631F7B268DEB07AA468B475747F0034` |
| `public/Videos/AdminLog.mp4` | 1702075 | `E1DB078B29F4FD090DC17C9B9146031BC17405B8024D3A8F8C334F8D14BB9BD2` |
| `public/Videos/CustomerLog.mp4` | 5455831 | `F02FFE4A107E515A31465BD64959C8964DD418EA0B539D57F3D10C9F9B76D531` |

## Other cleanup

- Removed the empty provider-specific handoff scaffold outside the Git repository after reading it; it contained no completed work.
- Preserved substantive earlier audit as vendor-neutral historical reference; current project state and repository rules are provider-independent.
- Rewrote README to describe actual maturity/stack, link the audit, and preserve sole-owner identity instead of inviting unrelated contributor identities.
- Expanded ignore rules for ordinary env/credential files and generated test/cache output. Existing node_modules/.next/tsbuildinfo were already ignored and were never tracked in baseline.
- Kept used hero, brand assets, legal notices, OpenStreetMap attribution, lockfile and migrations. Unused/demo application code is documented for discussion, not removed.

No history rewrite, remote deletion, collaborator change, bot, Action or assistant attribution was introduced. Remote publication remains blocked on owner-account authentication. Removing assets from the current tree does not erase older Git objects.
