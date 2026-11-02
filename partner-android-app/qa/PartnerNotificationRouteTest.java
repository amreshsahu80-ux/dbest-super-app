package com.dbest4u.partner;

/** Pure-Java smoke checks; no device, Firebase connection or Android emulator. */
public final class PartnerNotificationRouteTest {
    static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] ignored) {
        require(PartnerNotificationRoute.isAllowedVaahak(
            "vaahak_ride_offer", "/vaahak"), "Valid ride must open Vaahak");
        require(PartnerNotificationRoute.isAllowedVaahak(
            "qa_vaahak_one_device", "/vaahak"), "QA notification route");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            "marketplace_vendor_new_order", "/vaahak"), "Vendor alert not Vaahak");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            "vaahak_ride_offer", "https://other.example/vaahak"), "No external links");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            "vaahak_ride_offer", "//other.example/vaahak"), "No scheme-relative links");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            "vaahak_ride_offer", "/Vendor"), "No cross-role navigation");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            null, "/vaahak"), "No unknown event");
        require(!PartnerNotificationRoute.isAllowedVaahak(
            "vaahak_ride_offer", null), "No missing target");
        System.out.println("Vaahak notification route allowlist: 8/8 checks passed.");
    }
}
