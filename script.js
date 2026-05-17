const TRIADFIT_APP_ORIGIN_FALLBACK = "https://triad-q6ellhxxy-astinas-projects.vercel.app";

function resolveTriadFitEndpointUrl_() {
  if (typeof window !== "undefined" && window.location.protocol !== "file:") {
    return `${window.location.origin}/api/submit`;
  }
  return `${TRIADFIT_APP_ORIGIN_FALLBACK}/api/submit`;
}

const TRIADFIT_CONFIG = {
  endpointUrl: resolveTriadFitEndpointUrl_(),
  runtimeState: {
    webinarMode: "open",
    primaryRoutingEnabled: true,
    fallbackRoutingEnabled: true,
    operatorAlertsEnabled: true,
    capturePausedGlobal: false,
    capturePausedWebinar: false,
    capturePausedResources: false,
  },
  copy: {
    webinarSuccess:
      "You’re registered for the webinar. We’ll send the next steps to your inbox and phone.",
    webinarWaitlist:
      "This session is currently full. You’ve joined the waitlist and we’ll let you know when the next opening is available.",
    webinarHardStop:
      "We’re unable to accept registrations at the moment. Please try again later, or contact us at contact@triadfit.in if this is urgent.",
    resourceSuccess: "Your resource is ready below.",
    resourceHardStop:
      "We’re unable to deliver this resource at the moment. Please try again later.",
    resourcePaused:
      "Resource access is temporarily paused. You can still preview the page and come back later.",
  },
};

const GOAL_LABELS = {
  sustainable_fat_loss: "Sustainable fat loss",
  better_eating_habits: "Better eating habits",
  higher_energy_and_consistency: "Higher energy and consistency",
  hormone_friendly_nutrition: "Hormone-friendly nutrition",
  postpartum_wellness: "Postpartum wellness",
};

document.addEventListener("DOMContentLoaded", () => {
  initializeTriadFitForms();
});

async function initializeTriadFitForms() {
  const forms = document.querySelectorAll("[data-triadfit-form]");

  await syncRuntimeState();

  forms.forEach((form) => {
    applyRuntimeState(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await handleFormSubmit(form);
    });
  });
}

function applyRuntimeState(form) {
  const state = TRIADFIT_CONFIG.runtimeState;
  const formType = form.dataset.formType;

  clearStatus(form);

  if (formType === "webinar") {
    syncWebinarShell(form, state);
    if (state.capturePausedGlobal || state.capturePausedWebinar || state.webinarMode === "paused_unavailable") {
      setFormEnabled(form, false);
      setStatus(form, "error", TRIADFIT_CONFIG.copy.webinarHardStop);
      toggleAltAction(form, true);
      return;
    }

    setFormEnabled(form, true);
    toggleAltAction(form, false);
    if (state.webinarMode === "waitlist_full") {
      setStatus(
        form,
        "info",
        "This session is currently full. You can still join the waitlist for the next opening."
      );
    }
    return;
  }

  if (state.capturePausedGlobal || state.capturePausedResources) {
    setFormEnabled(form, false);
    setStatus(form, "error", TRIADFIT_CONFIG.copy.resourcePaused);
    return;
  }

  setFormEnabled(form, true);
}

function syncWebinarShell(form, state) {
  const heading = document.querySelector("[data-webinar-heading]");
  const intro = document.querySelector("[data-webinar-intro]");
  const submitButton = form.querySelector('button[type="submit"]');

  if (!heading || !intro || !submitButton) {
    return;
  }

  if (state.webinarMode === "waitlist_full") {
    heading.textContent = "Join the waitlist for the next live session";
    intro.textContent =
      "The current session is full. Leave your details and we’ll notify you when the next opening is available.";
    submitButton.textContent = "Join the waitlist";
    return;
  }

  if (state.webinarMode === "paused_unavailable" || state.capturePausedGlobal || state.capturePausedWebinar) {
    heading.textContent = "Webinar registration is temporarily unavailable";
    intro.textContent =
      "The webinar details are still here, but live registration is paused at the moment.";
    submitButton.textContent = "Registration unavailable";
    return;
  }

  heading.textContent = "First step to a lighter, more confident you.";
  intro.textContent =
    "A focused ₹99, 60-minute session to help you build a calmer, more consistent approach to weight loss and food habits.";
  submitButton.textContent = "Reserve your seat";
}

async function handleFormSubmit(form) {
  const validationError = validateForm(form);
  if (validationError) {
    setError(form, validationError);
    return;
  }

  setError(form, "");
  setPending(form, true);

  const payload = buildPayload(form);

  try {
    const response = await submitToEndpoint(payload);
    applySubmissionResult(form, payload, response);
  } catch (_error) {
    const fallbackMessage =
      payload.form_type === "webinar"
        ? TRIADFIT_CONFIG.copy.webinarHardStop
        : TRIADFIT_CONFIG.copy.resourceHardStop;
    setStatus(form, "error", fallbackMessage);
  } finally {
    setPending(form, false);
  }
}

async function syncRuntimeState() {
  if (!TRIADFIT_CONFIG.endpointUrl) {
    return;
  }

  try {
    const response = await fetch(TRIADFIT_CONFIG.endpointUrl);
    if (!response.ok) {
      throw new Error("Runtime state request failed");
    }

    const payload = await response.json();
    if (!payload.ok || !payload.controls) {
      throw new Error("Runtime state payload invalid");
    }

    TRIADFIT_CONFIG.runtimeState = {
      ...TRIADFIT_CONFIG.runtimeState,
      ...payload.controls,
    };
  } catch (_error) {
    // Keep the local defaults as a safe fallback if the live controls request fails.
  }
}

function validateForm(form) {
  const formType = form.dataset.formType;
  const name = form.querySelector('input[name="name"]')?.value.trim() ?? "";
  const email = form.querySelector('input[name="email"]')?.value.trim() ?? "";
  const phone = form.querySelector('input[name="phone"]')?.value.trim() ?? "";
  const goal = form.querySelector('select[name="goal"]')?.value.trim() ?? "";
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name) {
    return "Please enter your name.";
  }
  if (!emailValid) {
    return "Please enter a valid email address.";
  }
  if (formType === "webinar" && !phone) {
    return "Please enter your phone number.";
  }
  if (!goal) {
    return "Please select your biggest health goal.";
  }

  return "";
}

function buildPayload(form) {
  const formType = form.dataset.formType;
  const goalSelect = form.querySelector('select[name="goal"]');
  const selectedOption = goalSelect?.selectedOptions?.[0];
  const state = TRIADFIT_CONFIG.runtimeState;

  let conversionType = "resource_download";
  if (formType === "webinar") {
    conversionType = state.webinarMode === "waitlist_full" ? "webinar_waitlist" : "webinar_registration";
  }

  return {
    form_type: formType,
    conversion_type: conversionType,
    conversion_asset: form.dataset.conversionAsset,
    name: form.querySelector('input[name="name"]')?.value.trim() ?? "",
    email: form.querySelector('input[name="email"]')?.value.trim() ?? "",
    phone: form.querySelector('input[name="phone"]')?.value.trim() ?? "",
    goal_key: goalSelect?.value ?? "",
    goal_label: selectedOption?.textContent?.trim() ?? GOAL_LABELS[goalSelect?.value] ?? "",
    educational_updates_opt_in:
      form.querySelector('input[name="educational_updates_opt_in"]')?.checked ?? false,
    page_path: window.location.pathname,
    user_agent: window.navigator.userAgent,
    submitted_at: new Date().toISOString(),
  };
}

async function submitToEndpoint(payload) {
  const response = await fetch(TRIADFIT_CONFIG.endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Submission failed");
  }

  return response.json();
}

function applySubmissionResult(form, payload, response) {
  if (response.submission_state === "hard_stop" || !response.ok) {
    setStatus(form, "error", response.visitor_message);
    return;
  }

  if (payload.form_type === "webinar") {
    const statusType = response.submission_state === "waitlist" ? "info" : "success";
    setStatus(form, statusType, response.visitor_message);
    completeForm(form, response.submission_state === "waitlist" ? "You’re on the waitlist" : "You’re registered");
    return;
  }

  setStatus(form, "success", response.visitor_message);
  revealResourceAccess(form, payload);
  completeForm(form, "Resource unlocked");
}

function revealResourceAccess(form, payload) {
  const targetId = form.dataset.accessTarget;
  const targetPanel = targetId ? document.getElementById(targetId) : null;

  if (!targetPanel) {
    return;
  }

  const note = targetPanel.querySelector(".resource-personalized-note");
  if (note) {
    note.textContent = `${payload.name}, start here for your goal: ${payload.goal_label}.`;
  }

  targetPanel.classList.remove("is-hidden");
  targetPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function completeForm(form, buttonLabel) {
  form.classList.add("is-complete");
  const fields = form.querySelectorAll("input, select");
  fields.forEach((field) => {
    field.disabled = true;
  });
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = buttonLabel;
    submitButton.disabled = true;
  }
}

function setPending(form, isPending) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton || form.classList.contains("is-complete")) {
    return;
  }

  if (isPending) {
    form.dataset.previousLabel = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
    return;
  }

  submitButton.disabled = false;
  submitButton.textContent = form.dataset.previousLabel || submitButton.textContent;
}

function setFormEnabled(form, enabled) {
  const fields = form.querySelectorAll("input, select, button");
  fields.forEach((field) => {
    if (field.type !== "submit") {
      field.disabled = !enabled;
    }
  });

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton && !form.classList.contains("is-complete")) {
    submitButton.disabled = !enabled;
  }

  form.classList.toggle("is-disabled", !enabled);
}

function clearStatus(form) {
  setError(form, "");
  setStatus(form, "", "");
}

function setError(form, message) {
  const errorEl = form.querySelector(".form-error");
  if (!errorEl) {
    return;
  }

  errorEl.textContent = message;
  errorEl.classList.toggle("is-visible", Boolean(message));
}

function setStatus(form, type, message) {
  const statusEl = form.querySelector(".form-status");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.className = "form-status";
  if (type) {
    statusEl.classList.add(`form-status--${type}`);
  }
  statusEl.classList.toggle("is-visible", Boolean(message));
}

function toggleAltAction(form, shouldShow) {
  const altAction = form.querySelector(".form-alt-action");
  if (!altAction) {
    return;
  }
  altAction.classList.toggle("is-hidden", !shouldShow);
}
