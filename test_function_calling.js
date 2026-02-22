const http = require('http');

const payload = JSON.stringify({
    message: "Can you verify the lithium battery rules on OSHA.gov?"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = http.request(options, (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Response Body:", JSON.stringify(json, null, 2));

            if (json.reply && (json.reply.includes("lithium") || json.reply.includes("batteries"))) {
                console.log("✅ PASS: AI returned relevant content.");
            } else {
                console.log("❌ FAIL: AI response did not contain expected keywords.");
            }
        } catch (e) {
            console.error("Error parsing response:", e);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
