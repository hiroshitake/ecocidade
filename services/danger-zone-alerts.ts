let alertsSuppressedForSession = false;

export function areDangerZoneAlertsSuppressed() {
  return alertsSuppressedForSession;
}

export function suppressDangerZoneAlertsForSession() {
  alertsSuppressedForSession = true;
}

export function resetDangerZoneAlertsForSession() {
  alertsSuppressedForSession = false;
}
