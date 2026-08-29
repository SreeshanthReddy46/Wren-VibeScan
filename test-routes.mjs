const routes = [
  '/',
  '/pricing',
  '/changelog',
  '/terms',
  '/privacy',
  '/terms-privacy',
  '/docs',
  '/docs/installation',
  '/docs/github-action',
  '/docs/understanding-reports',
  '/docs/faq',
  '/login',
  '/signup',
  '/dashboard',
  '/scans/scan-9021',
  '/settings'
];

async function testAll() {
  console.log('Testing Next.js App routes...');
  let failed = 0;
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3000${route}`);
      if (res.status === 200) {
        console.log(`✓ [200 OK] ${route}`);
      } else {
        console.error(`✗ [${res.status}] ${route}`);
        failed++;
      }
    } catch (err) {
      console.error(`✗ [ERROR] ${route} -> ${err.message}`);
      failed++;
    }
  }
  if (failed === 0) {
    console.log('\nAll 16 routes verified successfully with HTTP 200 OK!');
  } else {
    console.error(`\n${failed} routes failed verification.`);
    process.exit(1);
  }
}

testAll();
