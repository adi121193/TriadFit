const APPS_SCRIPT_EXEC_URL =
  "https://script.google.com/macros/s/AKfycbxnyFqShwWUPpoC2skS50rrxyIdanpQ6eY3UVtAIjMD3yFCWG5DV2bhG6ixT0FE0o04xA/exec";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

async function fetchAppsScript(method, payload) {
  const headers = { Accept: "application/json" };
  const requestInit = {
    method,
    headers,
    redirect: "manual",
  };

  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    requestInit.body = JSON.stringify(payload);
  }

  let response = await fetch(APPS_SCRIPT_EXEC_URL, requestInit);

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const redirectUrl = response.headers.get("location");
    if (!redirectUrl) {
      throw new Error("Apps Script redirect missing location header.");
    }

    const followMethod =
      method === "POST" && [301, 302, 303].includes(response.status) ? "GET" : method;
    const followInit = {
      method: followMethod,
      headers: { Accept: "application/json" },
      redirect: "manual",
    };

    if (followMethod !== "GET" && payload !== undefined) {
      followInit.headers["Content-Type"] = "application/json";
      followInit.body = JSON.stringify(payload);
    }

    response = await fetch(redirectUrl, followInit);
  }

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (_error) {
    json = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    json,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      const upstream = await fetchAppsScript("GET");

      if (!upstream.ok || !upstream.json) {
        res.status(502).json({
          ok: false,
          submission_state: "hard_stop",
          visitor_message: "We’re unable to read the current registration state right now.",
          debug_status: upstream.status,
          debug_body: upstream.text.slice(0, 500),
        });
        return;
      }

      res.status(200).json(upstream.json);
      return;
    }

    if (req.method === "POST") {
      const payload =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body || {};

      const upstream = await fetchAppsScript("POST", payload);

      if (upstream.json) {
        res.status(upstream.ok ? 200 : 502).json(upstream.json);
        return;
      }

      res.status(502).json({
        ok: false,
        submission_state: "hard_stop",
        visitor_message:
          payload.form_type === "webinar"
            ? "We’re unable to accept registrations at the moment. Please try again later, or contact us at contact@triadfit.in if this is urgent."
            : "We’re unable to deliver this resource at the moment. Please try again later.",
        debug_status: upstream.status,
        debug_body: upstream.text.slice(0, 500),
      });
      return;
    }

    res.status(405).json({ ok: false, error: "Method not allowed." });
  } catch (error) {
    res.status(500).json({
      ok: false,
      submission_state: "hard_stop",
      visitor_message: "We’re unable to process this request right now. Please try again later.",
      error: error.message,
    });
  }
}
