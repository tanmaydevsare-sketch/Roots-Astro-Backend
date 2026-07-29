const http = require('http');

function request(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : '';
        
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        if (data) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }
        
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
        if (data) {
            req.write(postData);
        }
        req.end();
    });
}

async function run() {
    try {
        console.log("1. Logging in as local admin...");
        const loginRes = await request('POST', '/api/auth/login', {
            email: 'admin@test.com',
            password: 'password123'
        });
        
        if (loginRes.statusCode !== 200) {
            console.error("❌ Login failed:", loginRes.body);
            return;
        }
        
        const token = loginRes.body.token;
        console.log("✅ Logged in successfully!");

        console.log("\n2. Fetching categories...");
        const catsRes = await request('GET', '/api/admin/categories', null, token);
        console.log(`Status: ${catsRes.statusCode}, Found Categories: ${catsRes.body.length}`);
        
        const testCategoryName = "Bulk Test Category " + Date.now();
        console.log(`\n3. Testing bulk upload category ("${testCategoryName}")...`);
        const uploadCatsRes = await request('POST', '/api/admin/categories/bulk-upload', {
            data: [
                { name: testCategoryName, description: "Test Description" },
                { name: "Another Bulk Category " + Date.now(), description: "Test Description 2" }
            ]
        }, token);
        console.log("Upload Status:", uploadCatsRes.statusCode, "Response:", uploadCatsRes.body);

        console.log("\n4. Re-fetching categories to verify...");
        const catsAfterRes = await request('GET', '/api/admin/categories', null, token);
        const createdCats = catsAfterRes.body.filter(c => c.name.includes("Bulk Test Category") || c.name.includes("Another Bulk Category"));
        console.log(`Found newly created bulk categories: ${createdCats.length}`);
        createdCats.forEach(c => console.log(` - ID: ${c.id} | Name: "${c.name}" | Active: ${c.active}`));

        if (createdCats.length > 0) {
            const createdIds = createdCats.map(c => c.id);
            
            console.log("\n5. Testing bulk status change to Inactive...");
            const statusRes = await request('POST', '/api/admin/categories/bulk-status', {
                ids: createdIds,
                active: false
            }, token);
            console.log("Status update response:", statusRes.statusCode, statusRes.body);
            
            console.log("\n6. Re-fetching categories to verify status...");
            const catsVerifyStatus = await request('GET', '/api/admin/categories', null, token);
            const verifiedCats = catsVerifyStatus.body.filter(c => createdIds.includes(c.id));
            verifiedCats.forEach(c => console.log(` - ID: ${c.id} | Name: "${c.name}" | Active: ${c.active}`));

            console.log("\n7. Testing bulk delete categories...");
            const deleteCatsRes = await request('POST', '/api/admin/categories/bulk-delete', {
                ids: createdIds
            }, token);
            console.log("Delete response:", deleteCatsRes.statusCode, deleteCatsRes.body);

            console.log("\n8. Re-fetching categories to verify deletion...");
            const catsFinal = await request('GET', '/api/admin/categories', null, token);
            const remaining = catsFinal.body.filter(c => createdIds.includes(c.id));
            console.log(`Remaining newly created bulk categories in DB: ${remaining.length}`);
        }

    } catch (err) {
        console.error("❌ Error during test:", err);
    }
}

run();
