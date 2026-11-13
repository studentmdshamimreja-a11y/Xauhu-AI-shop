module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Allow', 'GET');
  return res.status(410).json({ error: 'Customer signup and login have been removed. Continue shopping without an account.' });
};
