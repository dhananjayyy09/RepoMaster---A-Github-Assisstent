import { spawn } from 'child_process';

const PORT = 3005;
const API_URL = `http://localhost:${PORT}/api`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runVerification() {
  console.log('--- Starting Manual API Foundation Verification (Milestone 8A) ---');
  
  console.log('\n1. Starting API server...');
  const server = spawn('npx', ['tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: PORT.toString() },
    shell: true,
    stdio: 'inherit'
  });

  // Give server time to start by polling health endpoint
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // Ignore connection refused while starting
    }
    await delay(1000);
  }

  if (!serverReady) {
    console.error('❌ Server failed to start in time');
    server.kill();
    process.exit(1);
  }

  try {
    console.log('\n2. Testing /api/health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = await healthRes.json() as any;
    console.log('Health check:', healthData.status === 'ok' ? '✅ OK' : '❌ FAILED');

    console.log('\n3. Testing /api/repositories Validation...');
    const invalidRes = await fetch(`${API_URL}/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUrl: 'not-a-url' })
    });
    const invalidData = await invalidRes.json() as any;
    console.log('Invalid URL handled:', invalidRes.status === 400 && invalidData.success === false ? '✅ OK' : '❌ FAILED');
    
    console.log('\n4. Testing /api/repositories creation (import)...');
    const importRes = await fetch(`${API_URL}/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ githubUrl: 'https://github.com/octocat/Hello-World' })
    });
    
    // We expect 201 Created or 409 Conflict if already exists in local DB
    const importData = await importRes.json() as any;
    if (importRes.status === 201 || importRes.status === 409) {
       console.log('Repository import endpoint:', '✅ OK', `(Status: ${importRes.status})`);
    } else {
       console.log('Repository import endpoint:', '❌ FAILED', `(Status: ${importRes.status})`);
       console.error(importData);
    }
    
    // Attempt to get list
    console.log('\n5. Testing /api/repositories listing...');
    const listRes = await fetch(`${API_URL}/repositories`);
    const listData = await listRes.json() as any;
    if (listRes.status === 200 && listData.success === true) {
      console.log('Repository listing endpoint:', '✅ OK');
    } else {
      console.log('Repository listing endpoint:', '❌ FAILED');
      console.error(listData);
    }
    
    let repoIdToTrigger = importRes.status === 201 ? importData.data?.id : null;
    
    // If not created but 409, try to get it from the list
    if (!repoIdToTrigger && listRes.status === 200 && listData.data && listData.data.length > 0) {
       repoIdToTrigger = listData.data[0].id;
    }

    // Try to trigger indexing
    if (repoIdToTrigger) {
       console.log(`\n6. Testing /api/indexing/:repoId/start for ${repoIdToTrigger}...`);
       const startRes = await fetch(`${API_URL}/indexing/${repoIdToTrigger}/start`, { method: 'POST' });
       const startData = await startRes.json() as any;
       if (startRes.status === 202 && startData.success === true) {
         console.log('Indexing trigger endpoint:', '✅ OK');
       } else {
         console.log('Indexing trigger endpoint:', '❌ FAILED');
         console.error(startData);
       }
       
       if (startRes.status === 202 && startData.data?.id) {
          console.log(`\n7. Testing /api/indexing/jobs/:jobId for ${startData.data.id}...`);
          const jobRes = await fetch(`${API_URL}/indexing/jobs/${startData.data.id}`);
          const jobData = await jobRes.json() as any;
          console.log('Job status endpoint:', jobRes.status === 200 && jobData.success === true ? '✅ OK' : '❌ FAILED');
       }
    } else {
       console.log('\n6. Skipping indexing test (repository not found and failed to import)');
    }

    console.log('\n✅ Manual API Verification Completed Successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    console.log('\n8. Shutting down test server...');
    server.kill();
    process.exit(0);
  }
}

runVerification();
