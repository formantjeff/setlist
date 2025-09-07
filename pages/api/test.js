// Simple test function to verify deployment
export default function handler(req, res) {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  
  res.status(200).json({ 
    message: 'API is working',
    method: req.method,
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 8) + '...' : 'not found'
  });
}