# DBest Hotel Upfront Search Price Comparison — 30 October 2026

## Customer experience now implemented
- The hotel search result card **immediately displays the DBest received contracted selling reference**, the public OTA price from the selected stay once loaded, and a prominent **Potential DBest savings* / price difference** when the DBest headline reference is lower. A disclaimer explicitly says the estimated difference is not verified savings until the room, occupancy, meal plan, tax basis and final payable total match.
- Typing a destination or property name (without clicking a check-price button) runs **debounced, on-demand public OTA lookup** for exact pre-verified hotel mappings visible in results, with at most two browser lookups per search, 650ms debounce, one request per hotel/stay in-flight, 15-minute cache, and three-minute repeated-error cooldown.
- Public OTA prices are deleted when stay dates or guest counts change; late responses matching an earlier stay are discarded. Customer may still manually choose Refresh. The UI never invents a price.
- Hotel photos and nonverified picture placeholders remain. Owner hidden 5% markup unchanged.

## Known verified OTA properties (pilot)
1. Hotel Nandan, Guwahati (HOTEL-NANDAN-GHY) — existing Google Hotels entity map.
2. Vivanta Guwahati (HIST-016) — existing verified entity map.
3. Ginger Agartala (DBEST-REPL-20261026-697) — existing verified entity map.
4. Royal Orchid Beach Resort & Spa Goa, Salcete (DBEST-REPL-20261024-138) — Google Travel public property search with title, location, dates and 2-adult/1-room verification. Live Chromium test observed MakeMyTrip public nightly reference INR 12,835 for 15–16 November 2026; dynamic lookup is not final checkout.

## Tested
- Real Chrome UI on desktop (1280px) and Android-like mobile (390px) with mocked API responses: typing **Guwahati** fired exactly 2 mapped hotel requests and populated both cards without an extra click; typing **Agartala** fired one; no lookup ran on an empty search, no horizontal overflow or Javascript errors.
- The test customer-facing Hotel Nandan result showed DBest reference INR 4,016.25, lowest public OTA reference INR 4,247, and potential difference INR 230.75. Test OTA responses are mocks; **real live public OTA fetches were separately verified previously** for the first three hotels.
- New HTML static/JS integrity tests `tests/hotel-upfront-auto-prices.test.cjs`: **4/4 passed**.
- Royal Orchid exact-date Google Search Google Hotels Chrome adapter returned `PUBLIC_GOOGLE_B2C_OFFERS_FOUND`, public MakeMyTrip reference INR 12,835 and confirmed 15–16 November 2026.
- Updated isolated Vercel preview deployment `dpl_7vkKzeLAS4CeRntrKWoYhRtrRGAD` READY. Hotel photo preview alias `dbest-hotel-photo-preview.vercel.app` reassigned to it. Not merged to production.

## Commercial limits / NO-GO
- **Only four mapped hotels** currently return automatic live OTA prices; the other catalogue hotels display DBest contracted reference if available, and an honest “Awaiting live rate” state. Never claim the entire 253-hotel catalogue has OTA B2C coverage.
- Potential savings is purely **the difference between two indicative reference values**, not a verified, comparable customer discount. The DBest reference may correspond to a different stay/room/occupancy/meal/tax basis than the public OTA. Do not advertise it as final saving.
- No confirmed DBest room inventory, direct checkout, payment webhook, tax-inclusive final quote, or paid voucher issuance. Booking enquiry email remains manually sent by guest.
- Browser compute is not free at scale; no paid OTA price API currently enabled, and current instance-rate cap is not globally enforceable. Do not turn on unlimited automatic live lookup.
- Protected Vercel preview URL cannot be independently opened by unauthenticated preview fetch. Actual hosted UI walkthrough remains pending user/authorized browser access. Production `dbest4u.com` untouched.
