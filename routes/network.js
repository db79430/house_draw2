// routes/network.js
app.get('/api/network/test', async (req, res) => {
    const dns = require('dns').promises;
    const net = require('net');
    
    const tests = [];
    
    // Тест DNS
    try {
      const addresses = await dns.resolve4('smtp.yandex.ru');
      tests.push({ test: 'DNS Resolution', success: true, addresses });
    } catch (error) {
      tests.push({ test: 'DNS Resolution', success: false, error: error.message });
    }
    
    // Тест подключения к портам
    const ports = [587, 465, 25];
    for (const port of ports) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(5000);
          socket.connect(port, 'smtp.yandex.ru', () => {
            socket.destroy();
            resolve();
          });
          socket.on('timeout', () => reject(new Error('Timeout')));
          socket.on('error', reject);
        });
        tests.push({ test: `Port ${port}`, success: true });
      } catch (error) {
        tests.push({ test: `Port ${port}`, success: false, error: error.message });
      }
    }
    
    res.json({ tests });
  });