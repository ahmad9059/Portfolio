// Keep-warm endpoint for Vercel Cron
// Add this to vercel.json:
// {
//   "crons": [{
//     "path": "/api/ping",
//     "schedule": "* * * * *"
//   }]
// }

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache");
  
  // Simple health check - keeps the function warm
  const memory = process.memoryUsage();
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + "MB",
    }
  });
};