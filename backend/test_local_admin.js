const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
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
        req.write(postData);
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        const req = http.request(options, (res) => {
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
    console.log("📡 DIAGNOSING LOCAL BACKEND ENDPOINTS 📡");
    console.log("=========================================\n");
    
    try {
        console.log("1. Attempting login as ADMIN (admin@test.com)...");
        const loginRes = await post('http://localhost:5000/api/auth/login', {
            email: 'admin@test.com',
            password: 'password123'
        });
        
        console.log(`   Status: ${loginRes.statusCode}`);
        if (loginRes.statusCode !== 200) {
            console.error("   ❌ Login failed:", loginRes.body);
        } else {
            const token = loginRes.body.token;
            console.log(`   ✅ Success! Logged in as: ${loginRes.body.user.firstName} (${loginRes.body.user.role})`);
            
            console.log("\n2. Fetching pending astrologers via Local API...");
            const pendingRes = await get('http://localhost:5000/api/astrologers/admin/pending', token);
            console.log(`   Status: ${pendingRes.statusCode}`);
            console.log(`   Pending count: ${Array.isArray(pendingRes.body) ? pendingRes.body.length : 'N/A'}`);
            if (pendingRes.statusCode !== 200) {
                console.error("   ❌ Failed:", pendingRes.body);
            } else {
                console.log("   Pending Astros names:", pendingRes.body.map(p => p.user?.firstName));
            }
            
            console.log("\n3. Fetching all users via Local API...");
            const usersRes = await get('http://localhost:5000/api/auth/admin/users', token);
            console.log(`   Status: ${usersRes.statusCode}`);
            console.log(`   Users count: ${Array.isArray(usersRes.body) ? usersRes.body.length : 'N/A'}`);
            if (usersRes.statusCode !== 200) {
                console.error("   ❌ Failed:", usersRes.body);
            }
        }
        
        console.log("\n-----------------------------------------");
        console.log("4. Attempting login as ENV Admin (admin@rootsastro.com)...");
        const envLoginRes = await post('http://localhost:5000/api/auth/login', {
            email: 'admin@rootsastro.com',
            password: 'supersecureadminpassword123'
        });
        
        console.log(`   Status: ${envLoginRes.statusCode}`);
        if (envLoginRes.statusCode !== 200) {
            console.error("   ❌ Login failed:", envLoginRes.body);
        } else {
            const token = envLoginRes.body.token;
            console.log(`   ✅ Success! Logged in as: ${envLoginRes.body.user.firstName} (${envLoginRes.body.user.role})`);
            
            console.log("\n5. Fetching pending astrologers with env admin token...");
            const pendingRes = await get('http://localhost:5000/api/astrologers/admin/pending', token);
            console.log(`   Status: ${pendingRes.statusCode}`);
            console.log(`   Pending count: ${Array.isArray(pendingRes.body) ? pendingRes.body.length : 'N/A'}`);
            if (pendingRes.statusCode !== 200) {
                console.error("   ❌ Failed:", pendingRes.body);
            }
        }
        
    } catch (err) {
        console.error("❌ Error running diagnostic:", err);
    }
    console.log("\n=========================================");
}

run();
