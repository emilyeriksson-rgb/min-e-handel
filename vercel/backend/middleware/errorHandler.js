export default function errorHandler(error, req, res, next) {
  console.error(`${req.method} ${req.path}: ${error.message}`);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "Något gick fel på servern. Försök igen senare.",
  });
}