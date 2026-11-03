export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method === "POST") {
      try {
        const data = await request.json();
        if (!data.id) return new Response("Missing ID", { status: 400, headers: corsHeaders });
        
        // Safely targets the hyphenated namespace
        await env["GoC-RAG-Planner"].put(data.id, JSON.stringify(data), { expirationTtl: 2592000 });
        return new Response("Saved", { status: 200, headers: corsHeaders });
      } catch(err) {
        return new Response("Error saving data", { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === "GET") {
      const planId = new URL(request.url).searchParams.get("plan");
      if (!planId) return new Response("Missing plan ID", { status: 400, headers: corsHeaders });

      const data = await env["GoC-RAG-Planner"].get(planId);
      if (!data) return new Response("Plan not found", { status: 404, headers: corsHeaders });

      return new Response(data, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
};