export const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'strict-dynamic'", "https://cdnjs.cloudflare.com"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", "https://api-inference.huggingface.co", "https://api.openai.com", "https://api.anthropic.com", "https://generativelanguage.googleapis.com", "https://api.groq.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
};

export function securityHeaders(req, res, next) {
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  next();
}
