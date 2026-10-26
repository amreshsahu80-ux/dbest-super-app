# JanSathi locality eligibility — PIN + distance proposal (NOT deployed)

## Why two signals?
An Indian PIN code is a **postal delivery area**, not a reliable definition of the same neighbourhood; different settlements can share one PIN. Distance alone based on current phone location allows visitors or passers-by to endorse issues unrelated to their residence.

## Recommended future configuration
- For **viewing news**: existing Village / Town / Block / District / State filters remain available to everyone; nationally highlighted posts remain Owner-only.
- For **Supporting an issue**: use a verified home locality and six-digit PIN, plus a generalized issue map point. Measure the distance between the registered **residential area** and the issue, not between the issue and a user's live device GPS.
- Initial Owner-configurable thresholds: **urban 5 km**, **rural 10 km**. Same verified village may qualify as an additional relevant civic jurisdiction when radius data is imprecise. Cross-PIN support should be possible when nearby; a shared PIN alone should not guarantee eligibility if the radius is exceeded.
- Protect privacy: coarse, rounded location for residential area; show no precise user home coordinates, names or contact details with votes. Issue locations should be public road/landmark positions only.
- Identity/accountability: use trusted DBest membership/address verification, not merely a user-entered PIN, browser storage or Supabase email-confirmed pilot account. A person gets one support per issue; reject self-support and rapid changes in registered locality; apply sockpuppet-abuse screening.
- Fallback if no reliable coordinates or geo lookup: restrict supports to verified same village/town until reliable distance calculations are available; never silently assume a correct kilometre distance from raw PIN-centre geocoding.
- Validate postal PIN codes against a trusted India Post dataset, and avoid assuming postal boundaries exactly match district boundaries.
- Do not activate user-facing kilometres/PIN eligibility until secure identity and geocoding checks are implemented and tested.

## Current deployed staging (25 Oct 2026)
- The **Support Issue** button and count are deployed to the **isolated JanSathi staging only**.
- Back end currently checks a registered self-declared town / district / state, or a matching village and block for village cases. Verified JanSathi pilot email sign-in required. Support registration can be changed only once in 30 days.
- Real PIN, GPS/distance, KYC-verified residential mapping and cross-project DBest identity are **not implemented**.
- Synthetic examples show fictional support counts only, with no database writes. The main DBest production site and Pro database are unchanged.
