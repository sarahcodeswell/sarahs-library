export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(req.body)
      });
  
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from API' });
    }
  }
  ```
  
  Save it (**Ctrl + S**).
  
  Now we need to update App.jsx to use `/api/chat` instead of calling Anthropic directly. 
  
  In your App.jsx, press **Ctrl + F** and search for:
  ```
  api.anthropic.com
  