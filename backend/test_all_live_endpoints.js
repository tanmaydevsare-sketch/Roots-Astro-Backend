const https = require('https');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body });
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    console.log("=========================================");
    console.log("📡 DIAGNOSING ALL LIVE ADMIN ENDPOINTS 📡");
    console.log("=========================================\n");
    
    try {
        console.log("1. Logging in to live Render backend...");
        const loginRes = await post('https://roots-astro-backend.onrender.com/api/auth/login', {
            email: 'admin@test.com',
            password: 'password123'
        });
        
        console.log(`   Status: ${loginRes.statusCode}`);
        if (loginRes.statusCode !== 200) {
            console.error("❌ Login failed:", loginRes.body);
            return;
        }
        
        const token = loginRes.body.token;
        
        console.log("\n2. Fetching pending astrologers list (/api/astrologers/admin/pending)...");
        const pendingRes = await get('https://roots-astro-backend.onrender.com/api/astrologers/admin/pending', token);
        console.log(`   Status: ${pendingRes.statusCode}`);
        console.log(`   Data type: ${typeof pendingRes.body}, isArray: ${Array.isArray(pendingRes.body)}`);
        if (pendingRes.statusCode !== 200) {
            console.error("❌ Error fetching pending:", pendingRes.body);
        }
        
        console.log("\n3. Fetching all users (/api/auth/admin/users)...");
        const usersRes = await get('https://roots-astro-backend.onrender.com/api/auth/admin/users', token);
        console.log(`   Status: ${usersRes.statusCode}`);
        console.log(`   Data type: ${typeof usersRes.body}, isArray: ${Array.isArray(usersRes.body)}`);
        if (usersRes.statusCode !== 200) {
            console.error("❌ Error fetching users:", usersRes.body);
        }

        console.log("\n4. Fetching admin finance dashboard (/api/finance/admin/dashboard)...");
        const financeRes = await get('https://roots-astro-backend.onrender.com/api/finance/admin/dashboard', token);
        console.log(`   Status: ${financeRes.statusCode}`);
        console.log(`   Response:`, financeRes.body);
        
    } catch (err) {
        console.error("❌ Error in live verification:", err);
    }
    console.log("\n=========================================");
}

run();
