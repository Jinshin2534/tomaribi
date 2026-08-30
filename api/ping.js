export default function handler(req, res) {
  res.status(200).json({ ok: true, node: process.version, method: req.method, bodyType: typeof req.body });
}
