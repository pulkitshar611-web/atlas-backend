async function verify() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@atlas.com', password: '123456' })
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
        if (response.ok && data.token) {
            console.log('LOGIN SUCCESSFUL');
        } else {
            console.log('LOGIN FAILED');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
verify();
