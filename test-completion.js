const fetch = require('node-fetch');

async function run() {
  const c = await fetch('http://localhost:3300/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'TEST_TASK',
      dueDate: '2026-03-05T00:00:00.000Z',
      status: 'TODO'
    })
  }).then(r => r.json());
  
  console.log('Created:', c);
  
  const id = c.id;
  const updateBody = { status: "DONE", completedAt: new Date() };
  console.log('Update body stringified:', JSON.stringify(updateBody));
  
  const u = await fetch(`http://localhost:3300/api/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateBody)
  }).then(r => r.json());
  
  console.log('Updated:', u);
  
  const all = await fetch('http://localhost:3300/api/todos').then(r=>r.json());
  const me = all.find(t=>t.id===id);
  console.log('Fetched:', me);
}
run();
