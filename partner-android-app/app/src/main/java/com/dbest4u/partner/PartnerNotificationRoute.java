package com.dbest4u.partner;

/**
 * Hardcoded internal-only notification route. Never navigate to a URL
 * supplied by a Firebase message or by a third-party Android intent.
 */
final class PartnerNotificationRoute {
    static final String VAAHAK_PATH = "/vaahak";
    static final String INTENT_EVENT = "dbest_partner_event_type";
    static final String INTENT_TARGET = "dbest_partner_target";

    private PartnerNotificationRoute() { }

    static boolean isAllowedVaahak(String eventType, String targetUrl) {
        if (!VAAHAK_PATH.equals(targetUrl)) return false;
        return "vaahak_ride_offer".equals(eventType)
            || "qa_vaahak_one_device".equals(eventType);
    }
}
