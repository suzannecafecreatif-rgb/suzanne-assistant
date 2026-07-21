import { handleAmeliaWebhookRequest } from "../../lib/ameliaWebhook.js";

export default async function handler(req, res) {
  const result = await handleAmeliaWebhookRequest({
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  res.status(result.status).json(result.body);
}
