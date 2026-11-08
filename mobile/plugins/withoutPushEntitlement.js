// SafeGuard only uses LOCAL notifications (shown by the phone itself after a Gmail scan).
// expo-notifications adds Apple's push entitlement (aps-environment) by default, which free
// Apple ID "Personal Team" signing doesn't allow. Remove it; local notifications don't need it.
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
