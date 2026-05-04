const TRIADFIT = {
  controlsSheetName: "controls",
  logSheetName: "submission_log",
  webinarModes: ["open", "waitlist_full", "paused_unavailable"],
  formTypes: ["webinar", "resource"],
  conversionTypes: ["webinar_registration", "webinar_waitlist", "resource_download"],
  conversionAssets: [
    "webinar_main",
    "resource_starter_kit",
    "resource_first_steps_checklist",
    "resource_mental_load_guide",
  ],
  goalKeys: [
    "sustainable_fat_loss",
    "better_eating_habits",
    "higher_energy_and_consistency",
    "hormone_friendly_nutrition",
    "postpartum_wellness",
  ],
  copy: {
    webinarSuccess:
      "You’re registered for the webinar. We’ll send the next steps to your inbox and phone.",
    webinarWaitlist:
      "This session is currently full. You’ve joined the waitlist and we’ll let you know when the next opening is available.",
    webinarHardStop:
      "We’re unable to accept registrations at the moment. Please try again later, or contact us at contact@triadfit.in if this is urgent.",
    resourceSuccess: "Your resource is on its way and access is unlocked below.",
    resourceHardStop:
      "We’re unable to deliver this resource at the moment. Please try again later.",
    resourcePaused:
      "Resource access is temporarily paused. You can still preview the page and come back later.",
  },
};

function doGet() {
  try {
    const controls = getControls_();
    return jsonResponse_({
      ok: true,
      service: "triadfit-intake",
      controls: controls,
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      service: "triadfit-intake",
      error: error.message,
    });
  }
}

function doPost(e) {
  const eventId = Utilities.getUuid();
  const logRecord = {
    timestamp: new Date(),
    eventId: eventId,
    email: "",
    formType: "",
    conversionType: "",
    conversionAsset: "",
    goalKey: "",
    primaryAttempted: false,
    primaryResult: "skipped",
    fallbackAttempted: false,
    fallbackResult: "skipped",
    finalState: "hard_stop",
    visitorMessageVariant: "unknown",
  };

  try {
    const payload = parsePayload_(e);
    logRecord.email = payload.email || "";
    logRecord.formType = payload.form_type || "";
    logRecord.conversionType = payload.conversion_type || "";
    logRecord.conversionAsset = payload.conversion_asset || "";
    logRecord.goalKey = payload.goal_key || "";

    validatePayload_(payload);

    const controls = getControls_();
    const operationalState = resolveOperationalState_(payload, controls);

    if (operationalState.kind === "hard_stop") {
      logRecord.finalState = operationalState.submissionState;
      logRecord.visitorMessageVariant = operationalState.messageVariant;
      appendSubmissionLog_(logRecord);
      maybeSendOperatorAlert_("capture_blocked", payload, logRecord, controls, operationalState.message);
      return jsonResponse_({
        ok: false,
        submission_state: operationalState.submissionState,
        visitor_message: operationalState.message,
        access_unlocked: false,
        waitlist_mode: false,
        contact_path: "none",
        event_id: eventId,
      });
    }

    const effectivePayload = applyOperationalConversion_(payload, operationalState);
    logRecord.conversionType = effectivePayload.conversion_type;

    const routingResult = routeContact_(effectivePayload, controls, eventId);
    logRecord.primaryAttempted = routingResult.primaryAttempted;
    logRecord.primaryResult = routingResult.primaryResult;
    logRecord.fallbackAttempted = routingResult.fallbackAttempted;
    logRecord.fallbackResult = routingResult.fallbackResult;

    if (!routingResult.ok) {
      logRecord.finalState = "hard_stop";
      logRecord.visitorMessageVariant =
        effectivePayload.form_type === "webinar" ? "webinar_hard_stop" : "resource_hard_stop";
      appendSubmissionLog_(logRecord);
      maybeSendOperatorAlert_("routing_failed", effectivePayload, logRecord, controls, routingResult.message);
      return jsonResponse_({
        ok: false,
        submission_state: "hard_stop",
        visitor_message: hardStopCopyFor_(effectivePayload.form_type),
        access_unlocked: false,
        waitlist_mode: false,
        contact_path: routingResult.contactPath,
        event_id: eventId,
      });
    }

    const response = successResponseFor_(effectivePayload, routingResult, eventId);
    logRecord.finalState = response.submission_state;
    logRecord.visitorMessageVariant =
      response.submission_state === "waitlist" ? "webinar_waitlist" : response.submission_state;
    appendSubmissionLog_(logRecord);

    if (routingResult.contactPath === "fallback") {
      maybeSendOperatorAlert_(
        "fallback_triggered",
        effectivePayload,
        logRecord,
        controls,
        "Brevo fallback handled the submission."
      );
    }

    return jsonResponse_(response);
  } catch (error) {
    appendSubmissionLog_(logRecord);
    maybeSendOperatorAlert_("script_error", null, logRecord, getControlsSafe_(), error.message);
    return jsonResponse_({
      ok: false,
      submission_state: "hard_stop",
      visitor_message: TRIADFIT.copy.resourceHardStop,
      access_unlocked: false,
      waitlist_mode: false,
      contact_path: "none",
      event_id: eventId,
      error: error.message,
    });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }
  return JSON.parse(e.postData.contents);
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.");
  }

  requireString_(payload.form_type, "form_type");
  requireString_(payload.conversion_type, "conversion_type");
  requireString_(payload.conversion_asset, "conversion_asset");
  requireString_(payload.name, "name");
  requireString_(payload.email, "email");
  requireString_(payload.goal_key, "goal_key");
  requireString_(payload.goal_label, "goal_label");

  assertIn_(payload.form_type, TRIADFIT.formTypes, "form_type");
  assertIn_(payload.conversion_type, TRIADFIT.conversionTypes, "conversion_type");
  assertIn_(payload.conversion_asset, TRIADFIT.conversionAssets, "conversion_asset");
  assertIn_(payload.goal_key, TRIADFIT.goalKeys, "goal_key");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Invalid email address.");
  }

  if (payload.form_type === "webinar" && !String(payload.phone || "").trim()) {
    throw new Error("Phone is required for webinar submissions.");
  }

  if (payload.form_type !== "resource" && payload.educational_updates_opt_in === true) {
    throw new Error("Educational updates consent is only supported for resource forms.");
  }
}

function resolveOperationalState_(payload, controls) {
  if (controls.capturePausedGlobal) {
    return {
      kind: "hard_stop",
      submissionState: "paused",
      message: hardStopCopyFor_(payload.form_type),
      messageVariant: "capture_paused_global",
    };
  }

  if (payload.form_type === "webinar") {
    if (controls.capturePausedWebinar || controls.webinarMode === "paused_unavailable") {
      return {
        kind: "hard_stop",
        submissionState: "paused",
        message: TRIADFIT.copy.webinarHardStop,
        messageVariant: "webinar_paused",
      };
    }

    if (controls.webinarMode === "waitlist_full") {
      return {
        kind: "waitlist",
        submissionState: "waitlist",
        message: TRIADFIT.copy.webinarWaitlist,
        messageVariant: "webinar_waitlist",
      };
    }
  }

  if (payload.form_type === "resource" && controls.capturePausedResources) {
    return {
      kind: "hard_stop",
      submissionState: "paused",
      message: TRIADFIT.copy.resourcePaused,
      messageVariant: "resource_paused",
    };
  }

  return {
    kind: "normal",
    submissionState: "accepted",
    message: payload.form_type === "webinar" ? TRIADFIT.copy.webinarSuccess : TRIADFIT.copy.resourceSuccess,
    messageVariant: payload.form_type === "webinar" ? "webinar_accepted" : "resource_accepted",
  };
}

function applyOperationalConversion_(payload, operationalState) {
  const nextPayload = Object.assign({}, payload);
  if (payload.form_type === "webinar" && operationalState.kind === "waitlist") {
    nextPayload.conversion_type = "webinar_waitlist";
  }
  return nextPayload;
}

function routeContact_(payload, controls, eventId) {
  const result = {
    ok: false,
    contactPath: "none",
    primaryAttempted: false,
    primaryResult: "skipped",
    fallbackAttempted: false,
    fallbackResult: "skipped",
    message: "",
  };

  if (controls.primaryRoutingEnabled) {
    result.primaryAttempted = true;
    const primary = submitToMailerLite_(payload, eventId);
    result.primaryResult = primary.result;
    if (primary.ok) {
      result.ok = true;
      result.contactPath = "primary";
      return result;
    }
    result.message = primary.message;
  }

  if (controls.fallbackRoutingEnabled) {
    result.fallbackAttempted = true;
    const fallback = submitToBrevo_(payload, eventId);
    result.fallbackResult = fallback.result;
    if (fallback.ok) {
      result.ok = true;
      result.contactPath = "fallback";
      return result;
    }
    result.message = fallback.message;
  }

  return result;
}

function submitToMailerLite_(payload, eventId) {
  const apiKey = getScriptProperty_("MAILERLITE_API_KEY");
  if (!apiKey) {
    return { ok: false, result: "skipped", message: "Missing MailerLite API key." };
  }

  const tagMap = parseJsonProperty_("MAILERLITE_GROUP_IDS_JSON", {});
  const groupIds = mapTagIdsForMailerLite_(payload, tagMap);
  const body = {
    email: payload.email,
    fields: {
      name: payload.name,
      phone: payload.phone || "",
      goal: payload.goal_key,
      first_conversion_type: payload.conversion_type,
      first_conversion_asset: payload.conversion_asset,
      last_conversion_type: payload.conversion_type,
      last_conversion_asset: payload.conversion_asset,
      educational_updates_opt_in: Boolean(payload.educational_updates_opt_in),
    },
    groups: groupIds,
    status: "active",
  };

  return fetchJson_(
    "https://connect.mailerlite.com/api/subscribers",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    },
    eventId,
    "primary"
  );
}

function submitToBrevo_(payload, eventId) {
  const apiKey = getScriptProperty_("BREVO_API_KEY");
  if (!apiKey) {
    return { ok: false, result: "skipped", message: "Missing Brevo API key." };
  }

  const listMap = parseJsonProperty_("BREVO_LIST_IDS_JSON", {});
  const listIds = mapListIdsForBrevo_(payload, listMap);
  const body = {
    email: payload.email,
    updateEnabled: true,
    getId: true,
    listIds: listIds,
    attributes: {
      NAME: payload.name,
      PHONE: payload.phone || "",
      GOAL: payload.goal_key,
      FIRST_CONVERSION_TYPE: payload.conversion_type,
      FIRST_CONVERSION_ASSET: payload.conversion_asset,
      LAST_CONVERSION_TYPE: payload.conversion_type,
      LAST_CONVERSION_ASSET: payload.conversion_asset,
      EDUCATIONAL_UPDATES_OPT_IN: Boolean(payload.educational_updates_opt_in),
    },
  };

  return fetchJson_(
    "https://api.brevo.com/v3/contacts",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    },
    eventId,
    "fallback"
  );
}

function fetchJson_(url, options, eventId, pathLabel) {
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const bodyText = response.getContentText();

  if (code >= 200 && code < 300) {
    return {
      ok: true,
      result: "accepted",
      message: pathLabel + " accepted " + eventId,
      responseCode: code,
      responseBody: bodyText,
    };
  }

  return {
    ok: false,
    result: code === 422 ? "rejected" : "error",
    message: pathLabel + " failed with HTTP " + code,
    responseCode: code,
    responseBody: bodyText,
  };
}

function successResponseFor_(payload, routingResult, eventId) {
  const isWaitlist = payload.conversion_type === "webinar_waitlist";
  return {
    ok: true,
    submission_state: isWaitlist ? "waitlist" : "accepted",
    visitor_message: isWaitlist ? TRIADFIT.copy.webinarWaitlist : successCopyFor_(payload.form_type),
    access_unlocked: payload.form_type === "resource",
    waitlist_mode: isWaitlist,
    contact_path: routingResult.contactPath,
    event_id: eventId,
  };
}

function successCopyFor_(formType) {
  return formType === "webinar" ? TRIADFIT.copy.webinarSuccess : TRIADFIT.copy.resourceSuccess;
}

function hardStopCopyFor_(formType) {
  return formType === "webinar" ? TRIADFIT.copy.webinarHardStop : TRIADFIT.copy.resourceHardStop;
}

function appendSubmissionLog_(record) {
  try {
    const sheet = getSheetByName_(TRIADFIT.logSheetName);
    sheet.appendRow([
      record.timestamp,
      record.eventId,
      record.email,
      record.formType,
      record.conversionType,
      record.conversionAsset,
      record.goalKey,
      record.primaryAttempted,
      record.primaryResult,
      record.fallbackAttempted,
      record.fallbackResult,
      record.finalState,
      record.visitorMessageVariant,
    ]);
  } catch (_error) {
  }
}

function maybeSendOperatorAlert_(alertType, payload, logRecord, controls, details) {
  if (!controls || !controls.operatorAlertsEnabled) {
    return;
  }

  const recipients = getScriptProperty_("OPERATOR_ALERT_EMAILS");
  if (!recipients) {
    return;
  }

  const subject = "[TriadFit] " + alertType;
  const lines = [
    "Alert type: " + alertType,
    "Event ID: " + (logRecord && logRecord.eventId ? logRecord.eventId : ""),
    "Email: " + (payload && payload.email ? payload.email : ""),
    "Form type: " + (payload && payload.form_type ? payload.form_type : ""),
    "Conversion type: " + (payload && payload.conversion_type ? payload.conversion_type : ""),
    "Conversion asset: " + (payload && payload.conversion_asset ? payload.conversion_asset : ""),
    "Details: " + (details || ""),
  ];

  MailApp.sendEmail({
    to: recipients,
    subject: subject,
    body: lines.join("\n"),
  });
}

function getControls_() {
  const sheet = getSheetByName_(TRIADFIT.controlsSheetName);
  const values = sheet.getDataRange().getValues();
  const map = {};

  for (let i = 1; i < values.length; i += 1) {
    const key = String(values[i][0] || "").trim();
    const rawValue = values[i][1];
    if (!key) {
      continue;
    }
    map[key] = rawValue;
  }

  const webinarMode = String(map.webinar_mode || "open").trim();
  assertIn_(webinarMode, TRIADFIT.webinarModes, "webinar_mode");

  return {
    webinarMode: webinarMode,
    primaryRoutingEnabled: toBoolean_(map.primary_routing_enabled, true),
    fallbackRoutingEnabled: toBoolean_(map.fallback_routing_enabled, true),
    operatorAlertsEnabled: toBoolean_(map.operator_alerts_enabled, true),
    capturePausedGlobal: toBoolean_(map.capture_paused_global, false),
    capturePausedWebinar: toBoolean_(map.capture_paused_webinar, false),
    capturePausedResources: toBoolean_(map.capture_paused_resources, false),
  };
}

function getControlsSafe_() {
  try {
    return getControls_();
  } catch (_error) {
    return {
      webinarMode: "open",
      primaryRoutingEnabled: false,
      fallbackRoutingEnabled: false,
      operatorAlertsEnabled: false,
      capturePausedGlobal: false,
      capturePausedWebinar: false,
      capturePausedResources: false,
    };
  }
}

function getSheetByName_(name) {
  const spreadsheetId = getScriptProperty_("TRIADFIT_SHEET_ID");
  if (!spreadsheetId) {
    throw new Error("Missing TRIADFIT_SHEET_ID script property.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    throw new Error("Missing sheet: " + name);
  }
  return sheet;
}

function mapTagIdsForMailerLite_(payload, tagMap) {
  const tags = tagsForPayload_(payload);
  return tags
    .map(function (tag) {
      return tagMap[tag];
    })
    .filter(function (value) {
      return Boolean(value);
    });
}

function mapListIdsForBrevo_(payload, listMap) {
  const tags = tagsForPayload_(payload);
  return tags
    .map(function (tag) {
      return listMap[tag];
    })
    .filter(function (value) {
      return typeof value === "number";
    });
}

function tagsForPayload_(payload) {
  const tags = [];

  if (payload.conversion_type === "webinar_registration") {
    tags.push("webinar_registered");
  }
  if (payload.conversion_type === "webinar_waitlist") {
    tags.push("webinar_waitlist");
  }
  if (payload.conversion_asset === "resource_starter_kit") {
    tags.push("resource_starter_kit");
  }
  if (payload.conversion_asset === "resource_first_steps_checklist") {
    tags.push("resource_first_steps_checklist");
  }
  if (payload.conversion_asset === "resource_mental_load_guide") {
    tags.push("resource_mental_load_guide");
  }
  if (payload.educational_updates_opt_in) {
    tags.push("consent_educational_updates");
  }

  return tags;
}

function getScriptProperty_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function parseJsonProperty_(key, fallbackValue) {
  const raw = getScriptProperty_(key);
  if (!raw) {
    return fallbackValue;
  }
  return JSON.parse(raw);
}

function requireString_(value, fieldName) {
  if (!String(value || "").trim()) {
    throw new Error("Missing required field: " + fieldName);
  }
}

function assertIn_(value, allowedValues, fieldName) {
  if (allowedValues.indexOf(value) === -1) {
    throw new Error("Invalid " + fieldName + ": " + value);
  }
}

function toBoolean_(value, defaultValue) {
  if (value === true || value === false) {
    return value;
  }
  if (value === 1 || value === 0) {
    return Boolean(value);
  }
  const normalized = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return defaultValue;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
