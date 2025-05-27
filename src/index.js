/**
 * Cloudflare Worker to connect EMS to SparkLoop
 * Handles subscriber confirmation and other SparkLoop operations
 */

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Response helper functions
const jsonResponse = (data, status = 200, additionalHeaders = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...additionalHeaders,
    },
  });
};

const errorResponse = (message, status = 400, details = null) => {
  const errorData = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  };
  return jsonResponse(errorData, status);
};

// Email validation function
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limiting helper (simple in-memory store for demo)
const rateLimitStore = new Map();

// Ghost webhook signature verification
const verifyGhostSignature = async (signature, body, secret) => {
  try {
    console.log(`DEBUG: Ghost signature received: "${signature}"`);
    console.log(`DEBUG: Body length: ${body.length}`);
    console.log(`DEBUG: Secret length: ${secret.length}`);
    
    // Ghost signature format: "sha256=hash, t=timestamp"
    const parts = signature.split(', ');
    const hashPart = parts.find(p => p.startsWith('sha256='));
    const timestampPart = parts.find(p => p.startsWith('t='));
    
    console.log(`DEBUG: Hash part: "${hashPart}"`);
    console.log(`DEBUG: Timestamp part: "${timestampPart}"`);
    
    if (!hashPart || !timestampPart) {
      console.log('Invalid Ghost signature format - missing hash or timestamp');
      return false;
    }
    
    const expectedHash = hashPart.replace('sha256=', '');
    const timestamp = timestampPart.replace('t=', '');
    
    console.log(`DEBUG: Expected hash: "${expectedHash}"`);
    console.log(`DEBUG: Timestamp: "${timestamp}"`);
    
    // Ghost signs the payload as: body + timestamp
    const payload = body + timestamp;
    console.log(`DEBUG: Payload to sign: "${payload.substring(0, 100)}..."`);
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedHash = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log(`DEBUG: Computed hash: "${computedHash}"`);
    
    const isValid = computedHash === expectedHash;
    console.log(`Ghost signature validation: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying Ghost signature:', error);
    return false;
  }
};

const isRateLimited = (ip, limit = 10, windowMs = 60000) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  const requests = rateLimitStore.get(ip);
  // Remove old requests outside the window
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= limit) {
    return true;
  }
  
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  return false;
};

// Store subscriber event in KV for tracking
const storeSubscriberEvent = async (email, status, sparkloopResult, additionalData, env) => {
  try {
    if (!env.SUBSCRIBER_LOGS) {
      console.log('KV storage not configured, skipping event storage');
      return;
    }

    const eventData = {
      email,
      status,
      sparkloop_response: sparkloopResult,
      additional_data: additionalData,
      timestamp: new Date().toISOString(),
      subscriber_uuid: sparkloopResult?.subscriber?.uuid,
      ref_code: sparkloopResult?.subscriber?.ref_code,
    };

    // Store with timestamp key for chronological access
    const timestampKey = `event_${Date.now()}_${email.replace('@', '_at_')}`;
    await env.SUBSCRIBER_LOGS.put(timestampKey, JSON.stringify(eventData));

    // Also store latest event per email for quick lookup
    const emailKey = `latest_${email.replace('@', '_at_')}`;
    await env.SUBSCRIBER_LOGS.put(emailKey, JSON.stringify(eventData));

    console.log(`Stored event in KV: ${timestampKey}`);
  } catch (error) {
    console.error('Error storing event in KV:', error);
    // Don't throw - this shouldn't break the main flow
  }
};

// Send notifications to Discord/Slack
const sendNotifications = async (email, status, sparkloopResult, additionalData, env) => {
  try {
    // Discord webhook
    if (env.DISCORD_WEBHOOK_URL && status === 'confirmed') {
      await sendDiscordNotification(email, sparkloopResult, additionalData, env);
    }

    // Slack webhook
    if (env.SLACK_WEBHOOK_URL && status === 'confirmed') {
      await sendSlackNotification(email, sparkloopResult, additionalData, env);
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Don't throw - this shouldn't break the main flow
  }
};

// Send Discord notification
const sendDiscordNotification = async (email, sparkloopResult, additionalData, env) => {
  const subscriber = sparkloopResult?.subscriber;
  const embed = {
    title: "🎉 New SparkLoop Subscriber!",
    color: 0x5865F2, // Discord blue
    fields: [
      {
        name: "Email",
        value: email,
        inline: true
      },
      {
        name: "Status",
        value: "✅ Confirmed",
        inline: true
      },
      {
        name: "Ref Code",
        value: subscriber?.ref_code || "N/A",
        inline: true
      },
      {
        name: "Source",
        value: additionalData?.source || additionalData?.ghost_event || "Unknown",
        inline: true
      },
      {
        name: "SparkLoop UUID",
        value: subscriber?.uuid || "N/A",
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "SparkLoop Integration"
    }
  };

  if (subscriber?.name) {
    embed.fields.unshift({
      name: "Name",
      value: subscriber.name,
      inline: true
    });
  }

  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      embeds: [embed]
    }),
  });

  console.log(`Sent Discord notification for ${email}`);
};

// Send Slack notification
const sendSlackNotification = async (email, sparkloopResult, additionalData, env) => {
  const subscriber = sparkloopResult?.subscriber;
  const message = {
    text: "🎉 New SparkLoop Subscriber!",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎉 New SparkLoop Subscriber!"
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Email:*\n${email}`
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n✅ Confirmed`
          },
          {
            type: "mrkdwn",
            text: `*Ref Code:*\n${subscriber?.ref_code || "N/A"}`
          },
          {
            type: "mrkdwn",
            text: `*Source:*\n${additionalData?.source || additionalData?.ghost_event || "Unknown"}`
          }
        ]
      }
    ]
  };

  if (subscriber?.name) {
    message.blocks[1].fields.unshift({
      type: "mrkdwn",
      text: `*Name:*\n${subscriber.name}`
    });
  }

  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  console.log(`Sent Slack notification for ${email}`);
};

// Main SparkLoop API interaction
const updateSparkLoopSubscriber = async (email, status = 'confirmed', additionalData = {}, env) => {
  const apiKey = env.SPARKLOOP_API_KEY;
  
  if (!apiKey) {
    throw new Error('SparkLoop API key not configured');
  }

  // For SparkLoop API v2, we need to check if subscriber exists first, then create or update
  let method = 'PUT';
  let endpoint = `https://api.sparkloop.app/v2/subscribers/${encodeURIComponent(email)}`;
  
  // Prepare payload with enhanced tracking data
  const payload = {
    status,
    ...additionalData,
  };

  // Remove internal tracking fields that shouldn't go to SparkLoop
  delete payload.ghost_event;
  delete payload.ghost_status;
  delete payload.subscribed;
  delete payload.source;

  console.log(`Updating SparkLoop subscriber: ${email} to status: ${status}`);

  const response = await fetch(endpoint, {
    method,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'SparkLoop-Worker/1.0',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    // If subscriber doesn't exist (404), try creating them
    if (response.status === 404) {
      console.log(`Subscriber ${email} not found, creating new subscriber`);
      
      const createPayload = {
        email,
        status,
        ...additionalData,
      };
      
      const createResponse = await fetch('https://api.sparkloop.app/v2/subscribers', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'SparkLoop-Worker/1.0',
        },
        body: JSON.stringify(createPayload),
      });
      
      const createResult = await createResponse.json();
      
      if (!createResponse.ok) {
        console.error(`SparkLoop API create error: ${createResponse.status}`, createResult);
        throw new Error(`SparkLoop API error: ${createResult.error || 'Unknown error'}`);
      }
      
      return createResult;
    }
    
    console.error(`SparkLoop API error: ${response.status}`, result);
    throw new Error(`SparkLoop API error: ${result.error || 'Unknown error'}`);
  }

  return result;
};

// Handle OPTIONS requests for CORS
const handleOptions = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

// Handle POST requests
const handlePost = async (request, env) => {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';

    // Rate limiting
    if (isRateLimited(clientIP)) {
      return errorResponse('Rate limit exceeded. Please try again later.', 429);
    }

    // Security: Check for authentication token (optional but recommended)
    if (env.AUTH_TOKEN) {
      const ghostSignature = request.headers.get('x-ghost-signature');
      const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
      const tokenParam = new URL(request.url).searchParams.get('token');
      
      let isAuthenticated = false;
      
      if (ghostSignature) {
        // Handle Ghost webhook signature validation
        const rawBody = await request.clone().text();
        isAuthenticated = await verifyGhostSignature(ghostSignature, rawBody, env.AUTH_TOKEN);
        console.log(`Ghost signature validation: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
      } else if (authHeader === env.AUTH_TOKEN || tokenParam === env.AUTH_TOKEN) {
        // Handle simple token auth for direct API calls
        isAuthenticated = true;
        console.log(`Simple token auth: SUCCESS`);
      }
      
      if (!isAuthenticated) {
        console.log(`Unauthorized access attempt from ${clientIP} - auth failed`);
        return errorResponse('Unauthorized', 401);
      }
      
      console.log(`Auth successful for ${clientIP}`);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Extract email and determine status based on Ghost webhook event or direct format
    let email, status = 'confirmed', additionalData = {};
    
    // Handle different Ghost webhook formats
    let member = null;
    if (body.member) {
      // Check for both formats: direct member data or member.current structure
      member = body.member.current || body.member;
    }
    
    if (member && member.email) {
      // Ghost webhook format - determine status based on member data and context
      email = member.email;
      
      console.log(`DEBUG: Processing Ghost member data:`, JSON.stringify(member, null, 2));
      
      // Determine status based on Ghost webhook context
      if (member.status === 'free' || member.status === 'paid') {
        // Member is active (added or updated to active status)
        status = 'confirmed';
      } else if (member.status === 'comped') {
        // Complimentary member
        status = 'confirmed';
      } else if (member.deleted || member.status === 'cancelled') {
        // Member was deleted or cancelled
        status = 'unsubscribed';
      } else {
        // Default to confirmed for new members
        status = 'confirmed';
      }
      
      // Check if this is an unsubscribe event based on Ghost webhook headers
      const ghostEvent = request.headers.get('x-ghost-event');
      if (ghostEvent === 'member.deleted' || ghostEvent === 'member.unsubscribed') {
        status = 'unsubscribed';
      } else if (ghostEvent === 'member.added' || ghostEvent === 'member.updated') {
        // For added/updated, check if they're actually subscribed
        if (member.subscribed === false) {
          status = 'unsubscribed';
        } else {
          status = 'confirmed';
        }
      }
      
      additionalData = {
        name: member.name,
        ghost_status: member.status,
        ghost_event: ghostEvent,
        subscribed: member.subscribed,
        source: 'ghost-webhook',
        ghost_uuid: member.uuid,
        ghost_id: member.id
      };
      
      console.log(`Processing Ghost webhook (${ghostEvent}) for member: ${email}, status: ${status}`);
    } else if (body.email) {
      // Direct format (backward compatibility)
      ({ email, status = 'confirmed', ...additionalData } = body);
      console.log(`Processing direct API call for: ${email}, status: ${status}`);
    } else {
      return errorResponse('Missing email. Expected either "email" field or "member.email" field', 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Validate status if provided
    const validStatuses = ['confirmed', 'unconfirmed', 'unsubscribed', 'bounced'];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 
        400
      );
    }

    // Update subscriber in SparkLoop
    const sparkloopResult = await updateSparkLoopSubscriber(email, status, additionalData, env);

    // Log successful operation
    console.log(`Successfully updated subscriber ${email} in SparkLoop:`, JSON.stringify(sparkloopResult, null, 2));

    // Store event in KV for tracking
    await storeSubscriberEvent(email, status, sparkloopResult, additionalData, env);

    // Send notifications if configured
    await sendNotifications(email, status, sparkloopResult, additionalData, env);

    // Return success response
    return jsonResponse({
      success: true,
      message: 'Subscriber updated successfully',
      email,
      status,
      sparkloop: sparkloopResult,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return appropriate error response
    if (error.message.includes('SparkLoop API')) {
      return errorResponse('Failed to update subscriber in SparkLoop', 502, {
        sparkloop_error: error.message,
      });
    }

    return errorResponse('Internal server error', 500, {
      error_id: crypto.randomUUID(),
    });
  }
};

// Handle GET requests for retrieving stored events
const handleGet = async (request, env) => {
  const url = new URL(request.url);
  
  // Simple auth check for GET requests
  if (env.AUTH_TOKEN) {
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const tokenParam = url.searchParams.get('token');
    
    if (authHeader !== env.AUTH_TOKEN && tokenParam !== env.AUTH_TOKEN) {
      return errorResponse('Unauthorized', 401);
    }
  }

  if (url.pathname.endsWith('/events')) {
    return getStoredEvents(request, env);
  } else if (url.pathname.endsWith('/stats')) {
    return getStats(request, env);
  }

  return errorResponse('Not found', 404);
};

// Get stored events from KV
const getStoredEvents = async (request, env) => {
  try {
    if (!env.SUBSCRIBER_LOGS) {
      return errorResponse('KV storage not configured', 500);
    }

    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (email) {
      // Get latest event for specific email
      const emailKey = `latest_${email.replace('@', '_at_')}`;
      const eventData = await env.SUBSCRIBER_LOGS.get(emailKey);
      
      if (!eventData) {
        return errorResponse('No events found for this email', 404);
      }

      return jsonResponse({
        email,
        event: JSON.parse(eventData)
      });
    } else {
      // Get recent events (this is a simplified version - in production you'd want pagination)
      const list = await env.SUBSCRIBER_LOGS.list({ prefix: 'event_', limit });
      const events = [];

      for (const key of list.keys) {
        const eventData = await env.SUBSCRIBER_LOGS.get(key.name);
        if (eventData) {
          events.push(JSON.parse(eventData));
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return jsonResponse({
        events: events.slice(0, limit),
        total: list.keys.length,
        has_more: list.list_complete === false
      });
    }
  } catch (error) {
    console.error('Error retrieving events:', error);
    return errorResponse('Failed to retrieve events', 500);
  }
};

// Get basic stats
const getStats = async (request, env) => {
  try {
    if (!env.SUBSCRIBER_LOGS) {
      return errorResponse('KV storage not configured', 500);
    }

    const eventsList = await env.SUBSCRIBER_LOGS.list({ prefix: 'event_', limit: 1000 });
    const latestList = await env.SUBSCRIBER_LOGS.list({ prefix: 'latest_', limit: 1000 });

    const stats = {
      total_events: eventsList.keys.length,
      unique_subscribers: latestList.keys.length,
      last_updated: new Date().toISOString()
    };

    return jsonResponse(stats);
  } catch (error) {
    console.error('Error retrieving stats:', error);
    return errorResponse('Failed to retrieve stats', 500);
  }
};

// Main fetch handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Log incoming request
    console.log(`${request.method} ${url.pathname} from ${request.headers.get('CF-Connecting-IP')}`);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Handle GET requests for data retrieval
    if (request.method === 'GET') {
      return handleGet(request, env);
    }

    // Only allow POST requests for the main functionality
    if (request.method !== 'POST') {
      return errorResponse('Method not allowed. Only GET and POST requests are supported.', 405);
    }

    // Handle the POST request
    return handlePost(request, env);
  },
}; 